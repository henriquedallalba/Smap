import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { environment } from '../../environments/environment';

/** Normaliza imagens salvas pela API para funcionar em qualquer porta local. */
@Directive({ selector: 'img[smapImage]', standalone: true })
export class OccurrenceImage {
  readonly smapImage = input<string | null | undefined>();
  private readonly element = inject(ElementRef<HTMLImageElement>);

  constructor() {
    effect(() => {
      const value = this.smapImage();
      if (!value) { this.element.nativeElement.removeAttribute('src'); return; }
      try {
        const url = new URL(value, window.location.origin);
        const api = new URL(environment.apiUrl, window.location.origin);
        if (['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '8080') {
          url.protocol = api.protocol; url.hostname = api.hostname; url.port = api.port;
        }
        this.element.nativeElement.src = url.toString();
        this.element.nativeElement.referrerPolicy = 'no-referrer';
      } catch { this.element.nativeElement.removeAttribute('src'); }
    });
  }
}

