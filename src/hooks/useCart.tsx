import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const previosCartRef = useRef<Product[]>();

  useEffect(() => {
    previosCartRef.current = cart;
  });

  const previosCartRefValues = previosCartRef.current ?? cart;

  useEffect(() => {
    if(previosCartRefValues !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  },[cart, previosCartRefValues]);

  const addProduct = async (productId: number) => {
    try {
      const copyCart = [... cart];
      const findProductCart = copyCart.find(product => product.id === productId);
      const amount = findProductCart ? (findProductCart.amount + 1): 1;

      const productStock = await api.get<Stock>(`/stock/${productId}`);

      if(amount > productStock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(findProductCart) {
        findProductCart.amount = amount;
      }else{
        const product = await api.get(`/products/${productId}`);
        const newProduct = {... product.data, amount: 1};
        copyCart.push(newProduct);
      }

      setCart(copyCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const copyCart = [... cart];
      const findProduct = copyCart.find(product => product.id === productId);

      if(!findProduct) {
        throw Error();
      }

      const updateCart = copyCart.filter(product => product.id !== findProduct.id);
      setCart(updateCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const productStock = await api.get<Stock>(`/stock/${productId}`);

      if(amount > productStock.data.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const copyCart = [... cart];
      const updateCart = copyCart.map(product => (product.id === productId ? {... product, amount} : {... product}))
      setCart(updateCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
