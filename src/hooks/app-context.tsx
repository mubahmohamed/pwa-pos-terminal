import React, { createContext, useState } from 'react';
import localForage from 'localforage';
import { TerminalState, TerminalServices, Order } from 'types';
import { isExist, getTimestamp } from 'utils';
import { newOrderItem } from './app-assets';
import { createOrder, getOrderData, getOrderItemIndexById } from './app-helpers';

type Context<S> = [S, (value: Partial<S>) => void, TerminalServices];

// initial state
export const TerminalInitialState: Context<TerminalState> = [
  {
    products: [],
    categories: [],
    orders: [],
    closedOrders: [],
    currentCategoryId: 0,
    currentOrderId: 0,
    currentUserId: 0,
    currentTableId: 0,
    currentItemId: 0,
  },
  () => {},
  null as any,
];

const readContextFromLocalStorage = (initState: TerminalState): TerminalState => {
  try {
    const storage = window.localStorage.getItem('state'); // get state from local storage
    return storage ? { ...initState, ...JSON.parse(storage) } : initState; // parse stored json or return initial state
  } catch (error) {
    console.error(error);
    return initState; // if error also return initial state
  }
};

const restoredState = readContextFromLocalStorage(TerminalInitialState[0]);

export const AppContext = createContext<Context<TerminalState>>(TerminalInitialState);

export const AppContextProvider: React.FC = ({ children }) => {
  const [state, setState] = useState<TerminalState>(restoredState);

  const setContext = (value: Partial<TerminalState>) => {
    try {
      const newState = { ...state, ...value };
      setState(newState); // update state
      console.info('State updated:', newState);
      localForage.setItem('state', JSON.stringify(newState)); // save state to local storage
    } catch (error) {
      throw new Error('Error writing data to offline storage.');
    }
  };

  const services: TerminalServices = {
    // Adds the selected item to the current order
    addItemToCurrentOrder: product => {
      let [updOrders, updOrder] = getOrderData(state);
      const currentItemIndex = getOrderItemIndexById(updOrder.items, product.id);

      // if the order item already exists just update it, otherwise create a new one.
      if (isExist(currentItemIndex)) {
        const item = updOrder.items[currentItemIndex];
        item.quantity = item.quantity + 1;
      } else {
        updOrder.items.push(newOrderItem(product));
      }

      updOrder.dateUpdated = getTimestamp(); // update the last modification time
      updOrder.totalAmount = updOrder.items.reduce((a, b) => a + b.quantity * b.price, 0);

      setContext({ orders: updOrders, currentOrderId: updOrder.id, currentItemId: 0 });
    },

    // Order Closing
    chargeOrder: (order, orderId) => {
      const updOrder = { ...order, dateUpdated: getTimestamp(), dateClose: getTimestamp() };
      const updOrders = [...state.orders.filter(order => order.id !== orderId)];
      const updClosedOrders = [updOrder, ...state.closedOrders];
      setContext({ orders: updOrders, closedOrders: updClosedOrders, currentItemId: 0 });
    },

    // Updates current order data
    updateCurrentOrder: order => {
      const updOrders = [...state.orders];
      let currentOrderIndex = updOrders.findIndex(order => state.currentOrderId === order.id);

      // if the order exists just update it
      if (isExist(currentOrderIndex)) {
        let updOrder: Order = { ...order };
        updOrder.dateUpdated = getTimestamp(); // update the last modification time
        updOrder.totalAmount = updOrder.items.reduce((a, b) => a + b.quantity * b.price, 0);
        updOrders[currentOrderIndex] = updOrder;
      }

      setContext({ orders: updOrders, currentItemId: 0 });
    },

    createOrder: () => {
      const [updOrders, updOrder] = createOrder(state);
      setContext({ orders: updOrders, currentOrderId: updOrder.id });
    },

    removeCategory: categoryId => {
      const updCategories = [...state.categories];
      const targetEntity = state.categories.findIndex(entity => categoryId === entity.id);
      if (!isExist(targetEntity)) throw new Error('The specified category does not exist');
      updCategories[targetEntity].isDeleted = true;
      setContext({ categories: updCategories });
    },

    updateCategory: category => {
      const updCategories = [...state.categories.filter(entity => entity.id !== category.id)];
      setContext({ categories: [...updCategories, { ...category, lastModifiedTime: getTimestamp() }] });
    },

    setCurrentCategory: (categoryId: number) => setContext({ currentCategoryId: categoryId }),
    setCurrentItem: (itemId: number) => setContext({ currentItemId: itemId }),
    setCurrentTable: (tableId: number) => setContext({ currentTableId: tableId }),
    setCurrentOrder: (orderId: number) => setContext({ currentOrderId: orderId }),
    setCurrentUser: (userId: number) => setContext({ currentUserId: userId }),
    addCategory: category => setContext({ categories: [...state.categories, category] }),

    addItem: product => setContext({ products: [...state.products, product] }),

    updateItem: item => {
      const updItems = [...state.products.filter(entity => entity.id !== item.id)];
      setContext({ products: [...updItems, { ...item, lastModifiedTime: getTimestamp() }] });
    },

    removeItem: itemId => {
      const updItems = [...state.products];
      const targetEntity = state.products.findIndex(entity => itemId === entity.id);
      if (!isExist(targetEntity)) throw new Error('The specified item does not exist');
      updItems[targetEntity].isDeleted = true;
      setContext({ products: updItems });
    },
  };

  return <AppContext.Provider value={[state, setContext, services]}>{children}</AppContext.Provider>;
};
