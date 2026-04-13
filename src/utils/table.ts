import dayjs from "dayjs";
// Common helper functions
export const convertToTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
// Table helper functions
export const stringSort = (key: string) => (a: any, b: any) => a[key]?.localeCompare(b[key]!);
export const categorySort = (key: string, categories: string[]) => (a: any, b: any) => categories.indexOf(a[key]) - categories.indexOf(b[key]);
export const dateSort = (key: string) => (a: any, b: any) => dayjs(a[key]).diff(dayjs(b[key]));
