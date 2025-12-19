import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floating-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './floating-input.html',
  styleUrls: ['./floating-input.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FloatingInputComponent),
      multi: true
    }
  ]
})
export class FloatingInputComponent implements OnInit, ControlValueAccessor {
  @Input() id!: string;
  @Input() label!: string;
  @Input() type: string = 'text';
  @Input() maxLength?: number;
  @Input() error?: string;
  @Input() icon?: any;
  @Input() formControl?: FormControl;

  isFocused: boolean = false;
  value: string = '';
  disabled: boolean = false;

  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor() {}

  ngOnInit(): void {
    // Initialize value from formControl if it exists
    if (this.formControl) {
      this.value = this.formControl.value || '';
      // Subscribe to formControl value changes to keep in sync
      this.formControl.valueChanges.subscribe(newValue => {
        this.value = newValue || '';
        this.onChange(newValue);
      });
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  get currentValue(): string {
    return this.formControl?.value || this.value || '';
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.value = value;
    this.onChange(value);
    
    if (this.formControl) {
      this.formControl.setValue(value, { emitEvent: false });
    }
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
    if (this.formControl) {
      this.formControl.markAsTouched();
    }
  }

  get displayError(): string {
    if (this.error) return this.error;
    if (this.formControl && this.formControl.invalid && this.formControl.touched) {
      if (this.formControl.hasError('required')) {
        return this.label + ' is required';
      }
      if (this.formControl.hasError('email')) {
        return 'Invalid email format';
      }
      if (this.formControl.hasError('pattern')) {
        return 'Invalid format';
      }
    }
    return '';
  }

  get hasValue(): boolean {
    return this.formControl?.value && this.formControl.value.length > 0;
  }
}

