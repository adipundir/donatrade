'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VaultContextType {
    isVaultOpen: boolean;
    openVault: () => void;
    closeVault: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isVaultOpen, setIsVaultOpen] = useState(false);

    const openVault = () => setIsVaultOpen(true);
    const closeVault = () => setIsVaultOpen(false);

    return (
        <VaultContext.Provider value={{ isVaultOpen, openVault, closeVault }}>
            {children}
        </VaultContext.Provider>
    );
};

export const useVaultModal = () => {
    const context = useContext(VaultContext);
    if (context === undefined) {
        throw new Error('useVaultModal must be used within a VaultProvider');
    }
    return context;
};
