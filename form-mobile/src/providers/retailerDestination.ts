import { Alert } from 'react-native';
import type { Product } from '../domain/types';
export interface RetailerDestination { viewProduct(product: Product): Promise<void>; }
/** Isolated seam for a future Rakuten adapter. No catalog, stock or affiliate calls. */
export const demoRetailerDestination: RetailerDestination = {
  async viewProduct(product) {
    Alert.alert('Retailer destination · demo', product.brand + ' · ' + product.name + '\n\nThis prototype does not open a live product listing. Price and sizes are fixture data; stock has not been checked.');
  },
};
