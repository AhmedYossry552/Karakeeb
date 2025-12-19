import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ApiService } from './api';

export interface VoiceUsage {
  count: number;
  limit: number;
  remaining: number;
  resetTime: string;
  lastResetTime: string;
  hoursUntilReset: number;
}

export interface TranscriptionResponse {
  success: boolean;
  transcription?: string;
  error?: string;
  message?: string;
  usage?: {
    voiceUsageCount: number;
    voiceUsageLimit: number;
    remaining: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptionService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private lastTranscriptionSubject = new BehaviorSubject<string | null>(null);
  private usageSubject = new BehaviorSubject<VoiceUsage | null>(null);

  isLoading$ = this.isLoadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  lastTranscription$ = this.lastTranscriptionSubject.asObservable();
  usage$ = this.usageSubject.asObservable();

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  get error(): string | null {
    return this.errorSubject.value;
  }

  get lastTranscription(): string | null {
    return this.lastTranscriptionSubject.value;
  }

  get usage(): VoiceUsage | null {
    return this.usageSubject.value;
  }

  constructor(private api: ApiService) {}

  async checkUsage(): Promise<void> {
    // Backend doesn't have a usage endpoint, so we set a default usage
    // Usage will be updated after transcription response
    try {
      // Set default usage (0/3) if not already set
      // This will be updated when transcription is called
      if (!this.usageSubject.value) {
        const defaultUsage: VoiceUsage = {
          count: 0,
          limit: 3,
          remaining: 3,
          resetTime: '',
          lastResetTime: '',
          hoursUntilReset: 24
        };
        this.usageSubject.next(defaultUsage);
      }
    } catch (err: any) {
      // Silently handle error - usage will be set after transcription
    }
  }

  async transcribe(audioBlob: Blob): Promise<string | null> {
    // Check if user has remaining transcriptions
    const currentUsage = this.usageSubject.value;
    if (currentUsage && currentUsage.remaining <= 0) {
      this.errorSubject.next('Daily transcription limit reached. Please try again tomorrow.');
      return null;
    }

    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    const formData = new FormData();
    
    // Convert Blob to File with correct MIME type
    // Backend expects field name 'audio' (not 'audioFile')
    const audioFile = new File([audioBlob], 'recording.webm', {
      type: 'audio/webm' // MediaRecorder produces webm format
    });
    
    formData.append('audio', audioFile); // Backend expects 'audio' field name
    formData.append('language', 'ar');

    try {
      const response = await firstValueFrom(
        this.api.post<TranscriptionResponse>('/transcription/transcribe', formData)
      );

      if (response.success && response.transcription) {
        this.lastTranscriptionSubject.next(response.transcription);
        
        // Update usage information from the response
        // Backend returns: { voiceUsageCount, voiceUsageLimit, remaining }
        // Map to VoiceUsage format
        if (response.usage) {
          const usage: VoiceUsage = {
            count: response.usage.voiceUsageCount,
            limit: response.usage.voiceUsageLimit || 3,
            remaining: response.usage.remaining,
            resetTime: '', // Backend doesn't provide this
            lastResetTime: '', // Backend doesn't provide this
            hoursUntilReset: 24 // Default to 24 hours
          };
          this.usageSubject.next(usage);
        }
        
        return response.transcription;
      } else {
        throw new Error(response.error || response.message || 'Transcription failed');
      }
    } catch (err: any) {
      const errorMessage = err.error?.message || err.error?.error || err.message || 'Transcription failed';
      
      // Handle specific error cases
      if (err.status === 403) {
        this.errorSubject.next('Access denied. You don\'t have permission to use this feature.');
      } else if (err.status === 401) {
        this.errorSubject.next('Please log in to use voice transcription.');
      } else if (err.status === 400) {
        if (errorMessage.includes('file type') || errorMessage.includes('Invalid audio')) {
          this.errorSubject.next('Invalid audio format. Please try recording again.');
        } else if (errorMessage.includes('too large')) {
          this.errorSubject.next('Audio file is too large. Please record a shorter message.');
        } else {
          this.errorSubject.next(errorMessage);
        }
      } else {
        this.errorSubject.next(errorMessage);
      }
      
      return null;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  resetTranscription(): void {
    this.lastTranscriptionSubject.next(null);
    this.errorSubject.next(null);
    this.isLoadingSubject.next(false);
  }
}

