import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ProductPurchase, Product, PurchaseError } from 'react-native-iap';
import { api } from '@/lib/api-client';
import { useUiStore } from '@/store/ui.store';
import PersistentTabBar from '@/components/PersistentTabBar';

const TOKEN_PACKS = [
  { sku: 'tokens_100', tokens: 100, price: '$0.99' },
  { sku: 'tokens_500', tokens: 500, price: '$3.99' },
  { sku: 'tokens_1200', tokens: 1200, price: '$7.99', badge: 'Popular' },
  { sku: 'tokens_3000', tokens: 3000, price: '$14.99', badge: 'Best Value' },
] as const;

const SKU_LIST = TOKEN_PACKS.map((p) => p.sku);

export default function StoreScreen() {
  const router = useRouter();
  const { tokenBalance, refreshTokenBalance } = useUiStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const iapRef = useRef<typeof import('react-native-iap') | null>(null);

  useEffect(() => {
    let purchaseListener: { remove: () => void } | null = null;
    let errorListener: { remove: () => void } | null = null;
    let mounted = true;

    async function setup() {
      try {
        const iap = await import('react-native-iap');
        if (!mounted) return;
        iapRef.current = iap;
        await iap.initConnection();
        const items = await iap.getProducts({ skus: SKU_LIST });
        if (mounted) setProducts(items);
        purchaseListener = iap.purchaseUpdatedListener(handlePurchase);
        errorListener = iap.purchaseErrorListener(handlePurchaseError);
      } catch (err) {
        if (mounted) setError('Could not load store. Please try again later.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setup();

    return () => {
      mounted = false;
      purchaseListener?.remove();
      errorListener?.remove();
      iapRef.current?.endConnection();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePurchase = useCallback(async (purchase: ProductPurchase) => {
    try {
      if (Platform.OS === 'ios' && purchase.transactionReceipt) {
        await api.validateAppleIAP(purchase.transactionReceipt);
      } else if (Platform.OS === 'android' && purchase.purchaseToken) {
        await api.validateGoogleIAP(purchase.purchaseToken, purchase.productId);
      }

      const iap = iapRef.current ?? (await import('react-native-iap'));
      await iap.finishTransaction({ purchase, isConsumable: true });
      await refreshTokenBalance();

      Alert.alert('Purchase Complete', 'Tokens have been added to your wallet!');
    } catch (err) {
      Alert.alert('Validation Error', 'Purchase succeeded but token delivery failed. Contact support if tokens are missing.');
    } finally {
      setPurchasing(null);
    }
  }, [refreshTokenBalance]);

  const handlePurchaseError = useCallback((err: PurchaseError) => {
    if (err.code === 'E_USER_CANCELLED') {
      setPurchasing(null);
      return;
    }
    setPurchasing(null);
    Alert.alert('Purchase Failed', err.message ?? 'Something went wrong. Please try again.');
  }, []);

  async function handleBuy(sku: string) {
    setError(null);
    setPurchasing(sku);
    try {
      const iap = iapRef.current ?? (await import('react-native-iap'));
      await iap.requestPurchase({ sku });
    } catch {
      setPurchasing(null);
    }
  }

  function getDisplayPrice(sku: string): string {
    const product = products.find((p) => p.productId === sku);
    if (product?.localizedPrice) return product.localizedPrice;
    return TOKEN_PACKS.find((p) => p.sku === sku)?.price ?? '';
  }

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="bg-gray-900 border-b border-gray-800 px-4 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center"
        >
          <Ionicons name="close" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-3 flex-1">Token Store</Text>
        <View className="flex-row items-center bg-purple-900/40 rounded-full px-3 py-1.5">
          <Text className="text-purple-300 text-xs font-semibold">
            {tokenBalance !== null ? tokenBalance.toLocaleString() : '—'} tokens
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Hero */}
        <View className="items-center mb-6 mt-2">
          <View className="w-16 h-16 rounded-2xl bg-purple-900/50 border border-purple-700/40 items-center justify-center mb-3">
            <Ionicons name="diamond" size={32} color="#a855f7" />
          </View>
          <Text className="text-white text-xl font-bold">Get Tokens</Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">
            Use tokens to unlock premium episodes
          </Text>
        </View>

        {error && (
          <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        )}

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#a855f7" size="large" />
            <Text className="text-gray-400 text-sm mt-3">Loading store...</Text>
          </View>
        ) : (
          <View className="gap-3">
            {TOKEN_PACKS.map((pack) => {
              const isActive = purchasing === pack.sku;
              return (
                <TouchableOpacity
                  key={pack.sku}
                  onPress={() => handleBuy(pack.sku)}
                  disabled={purchasing !== null}
                  activeOpacity={0.8}
                  className={`bg-gray-900 border rounded-2xl px-5 py-5 flex-row items-center ${
                    pack.badge === 'Best Value'
                      ? 'border-purple-600'
                      : 'border-gray-800'
                  }`}
                >
                  <View className="w-12 h-12 rounded-xl bg-purple-900/40 items-center justify-center">
                    <Ionicons
                      name="diamond"
                      size={22}
                      color="#a855f7"
                    />
                  </View>

                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-bold text-base">
                        {pack.tokens.toLocaleString()} Tokens
                      </Text>
                      {pack.badge && (
                        <View className={`px-2 py-0.5 rounded-full ${
                          pack.badge === 'Best Value'
                            ? 'bg-purple-600'
                            : 'bg-purple-900/60'
                        }`}>
                          <Text className="text-white text-[10px] font-bold">{pack.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {(pack.tokens / parseFloat(pack.price.replace('$', ''))).toFixed(0)} tokens per dollar
                    </Text>
                  </View>

                  <View className="items-center">
                    {isActive ? (
                      <ActivityIndicator color="#a855f7" />
                    ) : (
                      <View className="bg-purple-600 rounded-xl px-4 py-2.5">
                        <Text className="text-white font-semibold text-sm">
                          {getDisplayPrice(pack.sku)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Fine print */}
        <Text className="text-gray-600 text-[10px] text-center mt-6 px-4 leading-4">
          Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
          Tokens are non-refundable and have no cash value.
        </Text>
      </ScrollView>
      <PersistentTabBar />
    </View>
  );
}
