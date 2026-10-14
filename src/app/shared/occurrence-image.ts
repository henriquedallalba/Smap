import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Private photos use a bearer header, never credentials in a URL. */
@Directive({ selector: 'img[smapImage]', standalone: true })
export class OccurrenceImage {
  readonly smapImage = input<string | null | undefined>();
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly http = inject(HttpClient);
  constructor() {
    effect(onCleanup => {
      const image = this.element.nativeElement;
      image.removeAttribute('src');
      const value = this.smapImage();
      if (!value) return;
      let url: URL;
      try { url = new URL(value, window.location.origin); } catch { return; }
      if (!['http:', 'https:'].includes(url.protocol)) return;
      const base = new URL(environment.apiUrl, window.location.origin);
      const legacyLocal = ['localhost','127.0.0.1'].includes(url.hostname) && url.port === '8080';
      const owned = url.origin === base.origin || legacyLocal;
      const upload = url.pathname.match(/\/(uploads\/[a-f0-9-]+\.(jpg|png|webp|gif|heic|heif))$/);
      if (owned && upload) {
        let blobUrl: string | undefined;
        const subscription = this.http.get(environment.apiUrl.replace(/\/+$/, '')+'/'+upload[1], { responseType: 'blob' })
          .subscribe({next: blob => { blobUrl = URL.createObjectURL(blob); image.src = blobUrl; }, error: () => image.removeAttribute('src')});
        onCleanup(() => { subscription.unsubscribe(); if (blobUrl) URL.revokeObjectURL(blobUrl); image.removeAttribute('src'); });
      } else {
        if (['localhost','127.0.0.1'].includes(url.hostname) && url.port === '4200' && url.pathname.startsWith('/assets/')) {
          image.src = url.pathname;
        } else if (url.protocol === 'https:' || window.location.protocol !== 'https:' || url.origin === window.location.origin) {
          image.referrerPolicy = 'no-referrer'; image.src = url.href;
        }
      }
    });
  }
}
