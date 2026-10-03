import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();
async function photoBlob(photo) {
  if (!photo.webPath) throw new Error('Foto tidak ditemukan. Pilih foto lagi.');
  const response = await fetch(photo.webPath);
  if (!response.ok) throw new Error('Foto belum bisa dibuka. Coba lagi.');
  return response.blob();
}
export async function selectNativePhoto(source) {
  try {
    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 90, correctOrientation: true, saveToGallery: false,
      width: 2000, height: 2000,
    });
    return await photoBlob(photo);
  } catch (error) {
    if (/cancel|canceled|cancelled|user denied/i.test(error.message || '')) return null;
    throw error;
  }
}
export async function initializeNative({ onBack, onRestoredPhoto }) {
  if (!isNative) return;
  await App.addListener('backButton', onBack);
  // Android can reclaim the WebView while its external camera is open.
  await App.addListener('appRestoredResult', async result => {
    if (result.pluginId !== 'Camera' || !result.success || !result.data) return;
    try { await onRestoredPhoto(await photoBlob(result.data)); }
    catch (error) { await onRestoredPhoto(null, error); }
  });
}
export const minimizeNativeApp = () => App.minimizeApp();
