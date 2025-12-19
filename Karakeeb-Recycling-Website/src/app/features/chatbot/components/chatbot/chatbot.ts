import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranscriptionService, VoiceUsage } from '../../../../core/services/transcription.service';
import { MaterialExtractionService, ExtractedMaterial } from '../../../../core/services/material-extraction.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ItemsDisplayCardComponent } from '../../../voice-recorder/components/items-display-card/items-display-card';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, RouterLink, ItemsDisplayCardComponent],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss'
})
export class ChatbotComponent implements OnInit, OnDestroy {
  isRecording = signal(false);
  recordingTime = signal(0);
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  processingStarted = signal(false);
  structuredData = signal<ExtractedMaterial[] | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  checkingUsage = signal(false);
  manualText = signal<string>('');

  selectedImage: File | null = null;
  imagePreviewUrl: string | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any = null;
  private stream: MediaStream | null = null;

  constructor(
    public transcriptionService: TranscriptionService,
    private materialExtractionService: MaterialExtractionService,
    public authService: AuthService,
    public translation: TranslationService,
    private router: Router
  ) {
    // Watch for structured data changes
    effect(() => {
      const data = this.structuredData();
      const isLoading = this.loading();
      const isTranscriptionLoading = this.transcriptionService.isLoading;
      
      if (data && !isLoading && !isTranscriptionLoading && data.length > 0 && this.processingStarted()) {
        console.log('✅ AI Processing Complete!');
        console.log('Structured Data:', data);
        this.processingStarted.set(false);
        this.audioBlob = null;
        if (this.audioUrl) {
          URL.revokeObjectURL(this.audioUrl);
          this.audioUrl = null;
        }
        this.recordingTime.set(0);
      }
    });
  }

  ngOnInit(): void {
    if (this.isAuthenticated) {
      this.checkingUsage.set(true);
      this.transcriptionService.checkUsage().finally(() => {
        this.checkingUsage.set(false);
      });
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
    this.selectedImage = null;
  }

  get isAuthenticated(): boolean {
    return !!this.authService.getUser();
  }

  get usage(): VoiceUsage | null {
    return this.transcriptionService.usage;
  }

  get isLoading(): boolean {
    return this.transcriptionService.isLoading;
  }

  get isError(): string | null {
    return this.transcriptionService.error;
  }

  canRecord(): boolean {
    if (!this.isAuthenticated) return false;
    if (this.checkingUsage()) return false;
    const usage = this.usage;
    if (!usage) return false;
    return usage.remaining > 0;
  }

  async startRecording(): Promise<void> {
    if (!this.canRecord()) {
      return;
    }

    try {
      this.audioBlob = null;
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }
      this.processingStarted.set(false);
      this.transcriptionService.resetTranscription();
      this.structuredData.set(null);
      this.loading.set(false);
      this.error.set(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        this.audioBlob = blob;
        this.audioUrl = url;
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingTime.set(0);
      this.startTimer();
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      this.error.set(this.translation.t('Microphone access denied') || 'Microphone access denied');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.stopTimer();

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.recordingTime.update(time => time + 1);
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async handleDoneClick(): Promise<void> {
    if (this.audioBlob) {
      if (!this.canRecord()) {
        this.error.set(this.translation.t('Cannot process: daily limit reached or not authenticated') || 'Cannot process: daily limit reached or not authenticated');
        return;
      }

      this.processingStarted.set(true);
      try {
        const transcriptionResult = await this.transcriptionService.transcribe(this.audioBlob);
        if (transcriptionResult) {
          this.loading.set(true);
          this.error.set(null);
          try {
            const extracted = await this.materialExtractionService.extractMaterialsFromTranscription(transcriptionResult);
            this.structuredData.set(extracted);
          } catch (err: any) {
            this.error.set(err.message || this.translation.t('AI extraction failed') || 'AI extraction failed');
            this.structuredData.set(null);
          }
          this.loading.set(false);
        } else {
          this.processingStarted.set(false);
        }
      } catch (error) {
        console.error('Error during transcription:', error);
        this.processingStarted.set(false);
      }
    }
  }

  async handleManualTextSubmit(rawText: string): Promise<void> {
    const text = (rawText || '').trim();
    if (!text) {
      this.error.set(this.translation.t('Please enter text to analyze') || 'Please enter text to analyze');
      return;
    }

    if (!this.isAuthenticated) {
      this.error.set(this.translation.t('Please log in to use voice AI assistant') || 'Please log in to use voice AI assistant');
      return;
    }

    this.processingStarted.set(true);
    this.loading.set(true);
    this.error.set(null);
    this.structuredData.set(null);

    try {
      const extracted = await this.materialExtractionService.extractMaterialsFromTranscription(text);
      this.structuredData.set(extracted);
    } catch (err: any) {
      this.error.set(err.message || this.translation.t('AI extraction failed') || 'AI extraction failed');
      this.structuredData.set(null);
      this.processingStarted.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  handleImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedImage = null;
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
        this.imagePreviewUrl = null;
      }
      return;
    }

    const file = input.files[0];
    this.selectedImage = file;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  async handleImageAnalyze(): Promise<void> {
    if (!this.selectedImage) {
      this.error.set(this.translation.t('Please select an image first') || 'Please select an image first');
      return;
    }

    if (!this.isAuthenticated) {
      this.error.set(this.translation.t('Please log in to use voice AI assistant') || 'Please log in to use voice AI assistant');
      return;
    }

    this.processingStarted.set(true);
    this.loading.set(true);
    this.error.set(null);
    this.structuredData.set(null);

    try {
      const extracted = await this.materialExtractionService.extractMaterialsFromImage(this.selectedImage);
      this.structuredData.set(extracted);
    } catch (err: any) {
      this.error.set(err.message || this.translation.t('AI extraction failed') || 'AI extraction failed');
      this.structuredData.set(null);
      this.processingStarted.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  resetState(): void {
    this.recordingTime.set(0);
    this.audioBlob = null;
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.selectedImage = null;
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
    this.processingStarted.set(false);
    this.transcriptionService.resetTranscription();
    this.structuredData.set(null);
    this.loading.set(false);
    this.error.set(null);
    this.manualText.set('');
  }

  cancelRecording(): void {
    if (this.isRecording()) {
      this.stopRecording();
    }
    this.resetState();
  }

  // Helper methods for template
  Math = Math;
  random = Math.random;
  floor = Math.floor;
}
