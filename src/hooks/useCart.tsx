import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const hasProd = cart.find((product) => product.id === productId);

      if (!hasProd) {
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );

        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );

          toast("Adicionado");
          return;
        }
      }

      if (hasProd) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > hasProd.amount) {
          const increasesStock = cart.map((cartItem) =>
            cartItem.id === productId
              ? {
                  ...cartItem,
                  amount: cartItem.amount + 1,
                }
              : cartItem
          );
          setCart(increasesStock);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(increasesStock)
          );

          toast("Adicionado");
          return;
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProdToRemove = cart.some(
        (cartProd) => cartProd.id === productId
      );

      if (!hasProdToRemove) {
        toast.error("Erro na remoção do produto");

        return;
      }

      const filteredCart = cart.filter((cartItem) => cartItem.id !== productId);
      setCart(filteredCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(filteredCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Erro na atualização do produto");

        return;
      }

      const { data } = await api.get<Stock>(`stock/${productId}`);

      const getProductAmount = data.amount;
      const outOfStock = amount > getProductAmount;

      if (outOfStock) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      const hasProd = cart.some((cartProd) => cartProd.id === productId);

      if (!hasProd) {
        toast.error("Erro na atualização do produto");

        return;
      }

      const updateCart = cart.map((cartItem) =>
        cartItem.id === productId
          ? {
              ...cartItem,
              amount,
            }
          : cartItem
      );

      setCart(updateCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error("Erro na atualização do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
