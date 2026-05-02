import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const AVATAR_MAX_EDGE = 384;
const JPEG_QUALITY = 0.82;

/**
 * Abre a galeria, recorta 1:1, redimensiona e devolve `data:image/jpeg;base64,...` compacto.
 */
export async function pickProfilePhotoDataUrl(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Permissão para acessar a galeria negada.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const manip = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: AVATAR_MAX_EDGE } }],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!manip.base64) {
    return null;
  }

  return `data:image/jpeg;base64,${manip.base64}`;
}
