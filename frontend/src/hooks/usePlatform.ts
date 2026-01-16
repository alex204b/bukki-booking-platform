import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface PlatformInfo {
  isNative: boolean;
  isWeb: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  platform: string;
}

export const usePlatform = (): PlatformInfo => {
  const [platformInfo] = useState<PlatformInfo>(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    return {
      isNative: isNative,
      isWeb: platform === 'web',
      isAndroid: platform === 'android',
      isIOS: platform === 'ios',
      platform: platform,
    };
  });

  return platformInfo;
};
