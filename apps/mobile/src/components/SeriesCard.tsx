import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Series } from '@/lib/api-client';

interface Props {
  series: Series;
  horizontal?: boolean;
}

export default function SeriesCard({ series, horizontal }: Props) {
  const router = useRouter();

  if (horizontal) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/series/${series.id}`)}
        className="w-36"
        activeOpacity={0.8}
      >
        {series.coverImageUrl ? (
          <Image
            source={{ uri: series.coverImageUrl }}
            className="w-36 h-48 rounded-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="w-36 h-48 rounded-xl bg-gray-800 items-center justify-center">
            <Text className="text-gray-600 text-3xl font-bold">
              {series.title[0].toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="text-white text-xs font-semibold mt-2 px-0.5" numberOfLines={1}>
          {series.title}
        </Text>
        {series.genreTags?.[0] && (
          <Text className="text-gray-400 text-xs px-0.5" numberOfLines={1}>
            {series.genreTags[0]}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => router.push(`/series/${series.id}`)}
      className="flex-1"
      activeOpacity={0.8}
    >
      {series.coverImageUrl ? (
        <Image
          source={{ uri: series.coverImageUrl }}
          className="w-full aspect-[2/3] rounded-xl"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full aspect-[2/3] rounded-xl bg-gray-800 items-center justify-center">
          <Text className="text-gray-600 text-4xl font-bold">
            {series.title[0].toUpperCase()}
          </Text>
        </View>
      )}
      <Text className="text-white text-xs font-semibold mt-2 px-0.5" numberOfLines={2}>
        {series.title}
      </Text>
      {series.genreTags?.[0] && (
        <Text className="text-gray-400 text-xs px-0.5" numberOfLines={1}>
          {series.genreTags[0]}
        </Text>
      )}
    </TouchableOpacity>
  );
}
