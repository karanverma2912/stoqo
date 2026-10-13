import { router, useLocalSearchParams } from "expo-router";
import { ProductForm } from "../../components/product-form";
import { Heading, Screen } from "../../components/ui";
import { useCart } from "../../lib/cart";
export default function NewProduct() {
  const { barcode = "", returnTo } = useLocalSearchParams<{
      barcode?: string;
      returnTo?: string;
    }>(),
    cart = useCart();
  return (
    <Screen title="Add product" back>
      <Heading title="A new item, a fresh start." />
      <ProductForm
        barcode={barcode}
        onSaved={(p) => {
          if (returnTo === "cart") {
            cart.add(p);
            router.replace("/(tabs)/sell");
          } else router.replace(`/product/${p.id}`);
        }}
      />
    </Screen>
  );
}
