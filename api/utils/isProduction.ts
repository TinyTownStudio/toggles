import process from "node:process";

export const isProduction = (): boolean => {
  return process.env.LOCAL !== "true";
};
