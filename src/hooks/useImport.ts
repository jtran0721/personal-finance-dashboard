import { createContext, useContext } from 'react';

interface ImportApi {
  open: () => void;
}

/** Lets any page trigger the global import modal without prop drilling. */
export const ImportContext = createContext<ImportApi>({ open: () => undefined });

export const useImport = () => useContext(ImportContext);
