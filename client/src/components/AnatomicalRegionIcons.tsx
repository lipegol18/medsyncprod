// Anatomical Region Icon Mapping
// Maps anatomical region IDs to their corresponding SVG icons (gray and blue variants)

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

export const ANATOMICAL_REGION_ICONS: Record<number, RegionIcons> = {
  1: { gray: shoulderGray, blue: shoulderBlue },        // Ombro
  2: { gray: elbowGray, blue: elbowBlue },              // Cotovelo
  3: { gray: handWristGray, blue: handWristBlue },      // Mão e Punho
  4: { gray: hipGray, blue: hipBlue },                  // Quadril
  5: { gray: kneeGray, blue: kneeBlue },                // Joelho
  6: { gray: footAnkleGray, blue: footAnkleBlue },      // Pé e Tornozelo
  7: { gray: spineGray, blue: spineBlue },              // Coluna Vertebral
};

export function getAnatomicalRegionIcon(regionId: number, selected: boolean = false): string | undefined {
  const icons = ANATOMICAL_REGION_ICONS[regionId];
  if (!icons) return undefined;
  
  return selected ? icons.blue : icons.gray;
}
