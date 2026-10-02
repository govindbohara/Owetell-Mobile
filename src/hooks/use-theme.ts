import { Colors } from '@/constants/theme';

/**
 * The app deliberately ships a single cream surface, matching owetell.ninja,
 * so this does not follow the system colour scheme.
 */
export function useTheme() {
  return Colors.light;
}
