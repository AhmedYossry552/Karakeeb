import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private confirmationSubject = new Subject<{
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  }>();

  confirmation$: Observable<{
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  }> = this.confirmationSubject.asObservable();

  confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationSubject.next({ options, resolve });
    });
  }
}

