import type { ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color: ColorValue;
};

/** The owetell receipt mark — logo and the "rooms" tab icon. */
export function ReceiptIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 3h14v16.5l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M8.5 7h7M8.5 10h7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path
        d="M9.5 13.2c.7.8 1.5 1.2 2.5 1.2s1.8-.4 2.5-1.2"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SubsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 11a8 8 0 0 0-13.7-5.6L4 7.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 13a8 8 0 0 0 13.7 5.6L20 16.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M4 4v3.6h3.6M20 20v-3.6h-3.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AnalyticsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="12" width="3.6" height="8" rx="1.2" stroke={color} strokeWidth={1.7} />
      <Rect x="10.2" y="4" width="3.6" height="16" rx="1.2" stroke={color} strokeWidth={1.7} />
      <Rect x="16.9" y="9" width="3.6" height="11" rx="1.2" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

export function PlusIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function TweaksIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M4 12h6M14 12h6" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path
        d="M16 4.8v4.4M8 9.8v4.4M8 14.8v4.4"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LogoutIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M16.5 8.5 20 12l-3.5 3.5M20 12h-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DownloadIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9.5 5.5 6.5 6.5-6.5 6.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ListIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6h11M9 12h11M9 18h11" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 6h.01M4 12h.01M4 18h.01" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function CalendarIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={color} strokeWidth={1.8} />
      <Path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function PencilIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h3.2L18.6 8.6a2 2 0 0 0 0-2.8l-.4-.4a2 2 0 0 0-2.8 0L4 16.8V20Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrashIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M14.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

export function SparkleIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 3.5 11.6 8 16 9.6 11.6 11.2 10 15.7 8.4 11.2 4 9.6 8.4 8 10 3.5Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M17.5 14.5 18.4 17l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Kept for the auth screens, which still reference the old names. */
export const HomeIcon = ReceiptIcon;
export const GroupsIcon = ReceiptIcon;
export const AccountIcon = LogoutIcon;
export const ActivityIcon = AnalyticsIcon;
