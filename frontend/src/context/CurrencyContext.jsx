import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

const CurrencyContext = createContext(null);

const STORAGE_KEY = "digiloq_active_currency";

const DEFAULT_RATES_TO_TRY = {
  TRY: 1.0,
  USD: 38.50,
  EUR: 41.80,
};

export function CurrencyProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [ratesToTry, setRatesToTry] = useState(DEFAULT_RATES_TO_TRY);
  const [activeCurrency, setActiveCurrencyState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || user?.display_currency || "TRY";
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRates = useCallback(async () => {
    try {
      const res = await api.get("/currencies/rates");
      if (res.data?.rates_to_try) {
        setRatesToTry(res.data.rates_to_try);
        setLastUpdated(new Date());
      }
    } catch {
      // Keep existing/default rates on temporary network glitch
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and 15-minute background polling interval
  useEffect(() => {
    fetchRates();

    const interval = setInterval(() => {
      fetchRates();
    }, 15 * 60 * 1000); // 15 minutes

    const onFocus = () => {
      fetchRates();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchRates]);

  // Sync when user profile loads
  useEffect(() => {
    if (user?.display_currency && !localStorage.getItem(STORAGE_KEY)) {
      setActiveCurrencyState(user.display_currency);
    }
  }, [user]);

  const setActiveCurrency = async (currency) => {
    setActiveCurrencyState(currency);
    localStorage.setItem(STORAGE_KEY, currency);
    if (user && user.display_currency !== currency) {
      try {
        await updateProfile({ display_currency: currency });
      } catch {
        // silent fail on network update
      }
    }
  };

  /**
   * Convert amount from `fromCurrency` to `toCurrency`
   */
  const convert = (amount, fromCurrency = "TRY", toCurrency = activeCurrency) => {
    const val = Number(amount || 0);
    if (!val || fromCurrency === toCurrency) return val;

    const fromRateToTry = ratesToTry[fromCurrency] || DEFAULT_RATES_TO_TRY[fromCurrency] || 1.0;
    const toRateToTry = ratesToTry[toCurrency] || DEFAULT_RATES_TO_TRY[toCurrency] || 1.0;

    // Convert fromCurrency -> TRY -> toCurrency
    const amountInTry = val * fromRateToTry;
    const converted = amountInTry / toRateToTry;
    return converted;
  };

  /**
   * Convert a dictionary of amounts { TRY: 100, USD: 50, EUR: 20 } to a single total in activeCurrency
   */
  const convertTotals = (byCurrencyDict, toCurrency = activeCurrency) => {
    if (!byCurrencyDict || typeof byCurrencyDict !== "object") return 0;
    let total = 0;
    for (const [cur, amt] of Object.entries(byCurrencyDict)) {
      total += convert(amt, cur, toCurrency);
    }
    return total;
  };

  /**
   * Format amount converted directly into active display currency
   */
  const formatInActive = (amount, fromCurrency = "TRY") => {
    const converted = convert(amount, fromCurrency, activeCurrency);
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: activeCurrency,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const value = useMemo(
    () => ({
      rates: ratesToTry,
      activeCurrency,
      setActiveCurrency,
      convert,
      convertTotals,
      formatInActive,
      loading,
      lastUpdated,
      refreshRates: fetchRates,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ratesToTry, activeCurrency, loading, lastUpdated, fetchRates]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}
