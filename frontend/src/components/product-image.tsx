import { Image } from "expo-image";
import { View } from "react-native";
import { Diamond } from "phosphor-react-native";
import { StyleProp, ImageStyle } from "react-native";
import { fileUrl } from "@/src/api/client";
import { useTheme } from "@/src/theme";

export function ProductImage({
  path,
  style,
  iconSize = 28,
}: {
  path?: string;
  style?: StyleProp<ImageStyle>;
  iconSize?: number;
}) {
  const { colors } = useTheme();
  const uri = fileUrl(path);
  if (!uri) {
    return (
      <View style={[{ alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary }, style as any]}>
        <Diamond size={iconSize} color={colors.brandPrimary} weight="fill" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style as any} contentFit="cover" transition={200} />;
}
