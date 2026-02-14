import shoulderGray from '@/assets/icons/anatomy/shoulder_gray.svg';
import shoulderBlue from '@/assets/icons/anatomy/shoulder_blue.svg';
import elbowGray from '@/assets/icons/anatomy/elbow_gray.svg';
import elbowBlue from '@/assets/icons/anatomy/elbow_blue.svg';
import handWristGray from '@/assets/icons/anatomy/hand_and_wrist_gray.svg';
import handWristBlue from '@/assets/icons/anatomy/hand_and_wrist_blue.svg';
import hipGray from '@/assets/icons/anatomy/hip_gray.svg';
import hipBlue from '@/assets/icons/anatomy/hip_blue.svg';
import kneeGray from '@/assets/icons/anatomy/knee_gray.svg';
import kneeBlue from '@/assets/icons/anatomy/knee_blue.svg';
import footAnkleGray from '@/assets/icons/anatomy/foot_and_ankle_gray.svg';
import footAnkleBlue from '@/assets/icons/anatomy/foot_and_ankle_blue.svg';
import spineGray from '@/assets/icons/anatomy/spine_gray.svg';
import spineBlue from '@/assets/icons/anatomy/spine_blue.svg';

export interface RegionIcons {
  gray: string;
  blue: string;
}

export const STATIC_ICON_MAP: Record<string, RegionIcons> = {
  shoulder: { gray: shoulderGray, blue: shoulderBlue },
  elbow: { gray: elbowGray, blue: elbowBlue },
  hand_and_wrist: { gray: handWristGray, blue: handWristBlue },
  hip: { gray: hipGray, blue: hipBlue },
  knee: { gray: kneeGray, blue: kneeBlue },
  foot_and_ankle: { gray: footAnkleGray, blue: footAnkleBlue },
  spine: { gray: spineGray, blue: spineBlue },
};

const LEGACY_ID_TO_KEY: Record<number, string> = {
  1: 'shoulder',
  2: 'elbow',
  3: 'hand_and_wrist',
  4: 'hip',
  5: 'knee',
  6: 'foot_and_ankle',
  7: 'spine',
};

export function getIconByKey(iconKey: string, selected: boolean = false): string | undefined {
  const staticIcons = STATIC_ICON_MAP[iconKey];
  if (staticIcons) {
    return selected ? staticIcons.blue : staticIcons.gray;
  }
  const variant = selected ? 'blue' : 'gray';
  return `/api/anatomy-icons/${iconKey}_${variant}.svg`;
}

export function getAnatomicalRegionIcon(
  regionId: number,
  selected: boolean = false,
  iconKey?: string | null
): string | undefined {
  if (iconKey) {
    return getIconByKey(iconKey, selected);
  }
  const legacyKey = LEGACY_ID_TO_KEY[regionId];
  if (legacyKey) {
    return getIconByKey(legacyKey, selected);
  }
  return undefined;
}
