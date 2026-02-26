"use client";

import { useState, useMemo } from "react";
import MoneyDisplay from "./components/MoneyDisplay";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AccountType = "TFSA" | "RRSP" | "FHSA" | "RESP" | "General" | "";

type CompoundFrequency = "Annually" | "Semi-Annually" | "Quarterly" | "Monthly" | "Daily";

const ACCOUNT_INFO: Record<string, { description: string; limit: string; taxAdvantage: string }> = {
  TFSA: {
    description: "Tax-Free Savings Account",
    limit: "$7,000/year",
    taxAdvantage: "Tax-free growth and withdrawals",
  },
  RRSP: {
    description: "Registered Retirement Savings Plan",
    limit: "18% of previous year income, max $31,560",
    taxAdvantage: "Tax-deductible contributions, tax-deferred growth",
  },
  FHSA: {
    description: "First Home Savings Account",
    limit: "$8,000/year ($40,000 lifetime)",
    taxAdvantage: "Tax-deductible contributions, tax-free withdrawals for first home",
  },
  RESP: {
    description: "Registered Education Savings Plan",
    limit: "$50,000 lifetime",
    taxAdvantage: "Government grants (CESG), tax-deferred growth",
  },
  General: {
    description: "Non-registered account",
    limit: "No limit",
    taxAdvantage: "No special tax advantage",
  },
};

const ACCOUNT_LIMITS: Record<string, { annualLimit: number | null; lifetimeLimit: number | null; limitDescription: string | null }> = {
  TFSA:    { annualLimit: 7000,  lifetimeLimit: null,  limitDescription: "$7,000/year" },
  RRSP:    { annualLimit: 31560, lifetimeLimit: null,  limitDescription: "$31,560/year" },
  FHSA:    { annualLimit: 8000,  lifetimeLimit: 40000, limitDescription: "$8,000/year ($40,000 lifetime)" },
  RESP:    { annualLimit: null,  lifetimeLimit: 50000, limitDescription: "$50,000 lifetime" },
  General: { annualLimit: null,  lifetimeLimit: null,  limitDescription: null },
};

function getCompoundFrequencyPerYear(frequency: CompoundFrequency): number {
  switch (frequency) {
    case "Annually":      return 1;
    case "Semi-Annually": return 2;
    case "Quarterly":     return 4;
    case "Monthly":       return 12;
    case "Daily":         return 365;
    default:              return 12;
  }
}

function getContributionPerPeriod(
  monthlyContribution: number,
  frequency: CompoundFrequency
): number {
  switch (frequency) {
    case "Annually":      return monthlyContribution * 12;
    case "Semi-Annually": return monthlyContribution * 6;
    case "Quarterly":     return monthlyContribution * 3;
    case "Monthly":       return monthlyContribution;
    case "Daily":         return monthlyContribution / (365 / 12);
    default:              return monthlyContribution;
  }
}

function calculateCompoundInterest(
  initialInvestment: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
  frequency: CompoundFrequency
): { totalBalance: number; totalContributed: number; totalInterest: number } {
  const P = initialInvestment;
  const r = annualReturn / 100;
  const n = getCompoundFrequencyPerYear(frequency);
  const t = years;
  const PMT = getContributionPerPeriod(monthlyContribution, frequency);

  const compoundPrincipal = P * Math.pow(1 + r / n, n * t);

  let annuityValue = 0;
  if (r > 0) {
    annuityValue = PMT * ((Math.pow(1 + r / n, n * t) - 1) / (r / n));
  } else {
    annuityValue = PMT * n * t;
  }

  const totalBalance = compoundPrincipal + annuityValue;
  const totalContributed = P + monthlyContribution * 12 * t;
  const totalInterest = totalBalance - totalContributed;

  return { totalBalance, totalContributed, totalInterest };
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateYearlyData(
  initialInvestment: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
  frequency: CompoundFrequency
): Array<{ year: number; totalBalance: number; totalContributed: number; showLabel: boolean }> {
  const data = [];
  const r = annualReturn / 100;
  const n = getCompoundFrequencyPerYear(frequency);
  const PMT = getContributionPerPeriod(monthlyContribution, frequency);
  const labelYears = new Set([
    0,
    Math.round(years * 0.25),
    Math.round(years * 0.5),
    Math.round(years * 0.75),
    years,
  ]);

  for (let t = 0; t <= years; t++) {
    const compoundPrincipal = initialInvestment * Math.pow(1 + r / n, n * t);

    let annuityValue = 0;
    if (r > 0) {
      annuityValue = PMT * ((Math.pow(1 + r / n, n * t) - 1) / (r / n));
    } else {
      annuityValue = PMT * n * t;
    }

    const totalBalance = compoundPrincipal + annuityValue;
    const totalContributed = initialInvestment + monthlyContribution * 12 * t;

    data.push({ year: t, totalBalance, totalContributed, showLabel: labelYears.has(t) });
  }

  return data;
}

function isValidInputs(
  initial: number,
  monthly: number,
  years: number,
  returnRate: number
): boolean {
  return (
    (initial > 0 || monthly > 0) &&
    years > 0 &&
    years <= 100 &&
    returnRate >= 0 &&
    returnRate <= 100
  );
}

function balanceFontSize(amount: number): string {
  if (amount >= 100_000_000) return "text-2xl font-bold text-violet-400";
  if (amount >= 1_000_000)   return "text-3xl font-bold text-violet-400";
  return "text-4xl font-bold text-violet-400 md:text-5xl";
}

function cardNumberFontSize(amount: number): string {
  if (amount >= 100_000_000) return "text-lg font-bold";
  if (amount >= 10_000_000)  return "text-xl font-bold";
  return "text-2xl font-bold";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDotLabel = (props: any) => {
  const { x, y, value, index, data } = props;
  const point = data?.[index];
  if (!point?.showLabel) return null;

  const formatted = value >= 1e12 ? `$${(value / 1e12).toFixed(1)}T`
    : value >= 1e9  ? `$${(value / 1e9).toFixed(1)}B`
    : value >= 1e6  ? `$${(value / 1e6).toFixed(1)}M`
    : value >= 1e3  ? `$${(value / 1e3).toFixed(0)}K`
    : `$${Math.round(value)}`;

  return (
    <g>
      <circle cx={x} cy={y} r={4} fill="#8b5cf6" stroke="#09090f" strokeWidth={2} />
      <text x={x} y={y - 12} textAnchor="middle" fill="#8b5cf6" fontSize={11} fontWeight="600">
        {formatted}
      </text>
    </g>
  );
};

export default function Home() {
  const [initialInvestment, setInitialInvestment] = useState<string>("");
  const [monthlyContribution, setMonthlyContribution] = useState<string>("");
  const [lengthOfTime, setLengthOfTime] = useState<string>("");
  const [annualReturn, setAnnualReturn] = useState<string>("");
  const [compoundFrequency, setCompoundFrequency] = useState<CompoundFrequency>("Monthly");
  const [accountType, setAccountType] = useState<AccountType>("");
  const [tfsaAnnualContribution, setTfsaAnnualContribution] = useState<string>("");
  const [tfsaContributionYears, setTfsaContributionYears] = useState<string>("");
  const [rrspAnnualIncome, setRrspAnnualIncome] = useState<string>("");
  const [rrspAnnualContribution, setRrspAnnualContribution] = useState<string>("");
  const [fhsaAnnualContribution, setFhsaAnnualContribution] = useState<string>("");
  const [respAnnualContribution, setRespAnnualContribution] = useState<string>("");

  // Convert account-specific annual contributions to a monthly equivalent for calculations
  const effectiveMonthly = useMemo(() => {
    if (accountType === "TFSA") {
      return (parseFloat(tfsaAnnualContribution) || 0) / 12;
    }
    if (accountType === "RRSP") {
      return (parseFloat(rrspAnnualContribution) || 0) / 12;
    }
    if (accountType === "FHSA") {
      return (parseFloat(fhsaAnnualContribution) || 0) / 12;
    }
    if (accountType === "RESP") {
      // Include the CESG grant (20% on first $2,500/year, max $500/year)
      const annual = parseFloat(respAnnualContribution) || 0;
      const cesg = Math.min(annual * 0.20, 500);
      return (annual + cesg) / 12;
    }
    return parseFloat(monthlyContribution) || 0;
  }, [accountType, tfsaAnnualContribution, rrspAnnualContribution, fhsaAnnualContribution, respAnnualContribution, monthlyContribution]);

  const results = useMemo(() => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = effectiveMonthly;
    const years = parseFloat(lengthOfTime) || 0;
    const returnRate = parseFloat(annualReturn) || 0;

    if (!isValidInputs(initial, monthly, years, returnRate)) return null;

    return calculateCompoundInterest(initial, monthly, returnRate, years, compoundFrequency);
  }, [initialInvestment, effectiveMonthly, lengthOfTime, annualReturn, compoundFrequency]);

  const chartData = useMemo(() => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = effectiveMonthly;
    const years = parseFloat(lengthOfTime) || 0;
    const returnRate = parseFloat(annualReturn) || 0;

    if (!isValidInputs(initial, monthly, years, returnRate)) return null;

    return calculateYearlyData(initial, monthly, returnRate, years, compoundFrequency);
  }, [initialInvestment, effectiveMonthly, lengthOfTime, annualReturn, compoundFrequency]);

  const comparisonScenarios = useMemo(() => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = effectiveMonthly;
    const years = parseFloat(lengthOfTime) || 0;
    const returnRate = parseFloat(annualReturn) || 0;

    if (!isValidInputs(initial, monthly, years, returnRate)) return null;

    const scenarios = [];

    const startNow = calculateCompoundInterest(initial, monthly, returnRate, years, compoundFrequency);
    const startNowBalance = startNow.totalBalance;

    scenarios.push({
      label: "Start Now",
      years,
      totalBalance: startNowBalance,
      highlight: true,
      missedAmount: 0,
    });

    if (years >= 5) {
      const wait5 = calculateCompoundInterest(initial, monthly, returnRate, years - 5, compoundFrequency);
      scenarios.push({
        label: "Wait 5 Years",
        years: years - 5,
        totalBalance: wait5.totalBalance,
        highlight: false,
        missedAmount: startNowBalance - wait5.totalBalance,
      });
    }

    if (years >= 10) {
      const wait10 = calculateCompoundInterest(initial, monthly, returnRate, years - 10, compoundFrequency);
      scenarios.push({
        label: "Wait 10 Years",
        years: years - 10,
        totalBalance: wait10.totalBalance,
        highlight: false,
        missedAmount: startNowBalance - wait10.totalBalance,
      });
    }

    return scenarios;
  }, [initialInvestment, effectiveMonthly, lengthOfTime, annualReturn, compoundFrequency]);

  const accountWarning = useMemo(() => {
    if (!accountType || accountType === "General") return null;

    const initial = parseFloat(initialInvestment) || 0;

    if (accountType === "TFSA") {
      const annual = parseFloat(tfsaAnnualContribution) || 0;
      if (annual > 7_000) {
        return `You've exceeded the $7,000 annual TFSA limit. Maximum annual contribution is $7,000.`;
      }
      return null;
    }

    if (accountType === "RRSP") {
      const income = parseFloat(rrspAnnualIncome) || 0;
      const annual = parseFloat(rrspAnnualContribution) || 0;
      if (annual > 0 && income > 0) {
        const limit = Math.min(income * 0.18, 31_560);
        if (annual > limit) {
          return `Your annual contribution of ${formatCurrency(annual)} exceeds your RRSP limit of ${formatCurrency(limit)}. Consider reducing your contribution.`;
        }
      }
      return null;
    }

    if (accountType === "FHSA") {
      const annual = parseFloat(fhsaAnnualContribution) || 0;
      if (annual > 8_000) {
        return `Your annual contribution of ${formatCurrency(annual)} exceeds the FHSA annual limit of $8,000.`;
      }
      if (initial > 40_000) {
        return `Your initial investment of ${formatCurrency(initial)} exceeds the FHSA lifetime limit of $40,000.`;
      }
      const years = parseFloat(lengthOfTime) || 0;
      if (annual > 0 && annual * years > 40_000) {
        const yearsUntilLimit = Math.floor(40_000 / annual);
        return `You'll hit the $40,000 FHSA lifetime limit in ${yearsUntilLimit} year${yearsUntilLimit !== 1 ? "s" : ""}. After that, no new contributions can be made.`;
      }
      return null;
    }

    if (accountType === "RESP") {
      const annual = parseFloat(respAnnualContribution) || 0;
      const years = parseFloat(lengthOfTime) || 0;
      if (annual > 0 && annual * years > 50_000) {
        return `Your lifetime RESP contributions (${formatCurrency(annual * years)}) will exceed the $50,000 limit. Consider reducing your annual contribution.`;
      }
      if (initial > 50_000) {
        return `Your initial investment of ${formatCurrency(initial)} exceeds the RESP lifetime limit of $50,000.`;
      }
      return null;
    }

    return null;
  }, [initialInvestment, accountType, tfsaAnnualContribution, rrspAnnualIncome, rrspAnnualContribution, fhsaAnnualContribution, respAnnualContribution, lengthOfTime]);

  const accountConfirmation = useMemo(() => {
    if (accountType === "TFSA") {
      const annual = parseFloat(tfsaAnnualContribution) || 0;
      if (annual > 0 && annual <= 7_000) {
        return `✓ Your annual contribution of ${formatCurrency(annual)} is within the TFSA limit.`;
      }
    }
    if (accountType === "RRSP") {
      const income = parseFloat(rrspAnnualIncome) || 0;
      const annual = parseFloat(rrspAnnualContribution) || 0;
      if (annual > 0 && income > 0) {
        const limit = Math.min(income * 0.18, 31_560);
        if (annual <= limit) {
          return `✓ Your annual contribution of ${formatCurrency(annual)} is within your RRSP limit of ${formatCurrency(limit)}.`;
        }
      }
    }
    if (accountType === "FHSA") {
      const annual = parseFloat(fhsaAnnualContribution) || 0;
      const years = parseFloat(lengthOfTime) || 0;
      if (annual > 0 && annual <= 8_000 && annual * years <= 40_000) {
        return `✓ Your annual contribution of ${formatCurrency(annual)} is within the FHSA limits.`;
      }
    }
    if (accountType === "RESP") {
      const annual = parseFloat(respAnnualContribution) || 0;
      const years = parseFloat(lengthOfTime) || 0;
      if (annual > 0 && annual * years <= 50_000) {
        return `✓ Your annual contribution of ${formatCurrency(annual)}/year is within the RESP lifetime limit.`;
      }
    }
    return null;
  }, [accountType, tfsaAnnualContribution, rrspAnnualIncome, rrspAnnualContribution, fhsaAnnualContribution, respAnnualContribution, lengthOfTime]);

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-[#09090f] py-3 text-zinc-50 placeholder-zinc-500 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50";
  const labelClass = "block text-sm font-medium mb-2 text-zinc-300";

  return (
    <div className="min-h-screen bg-[#09090f] text-zinc-50">
      <div className="container mx-auto max-w-2xl px-4 pt-14 pb-0 sm:px-6 lg:px-8">

        {/* Header */}
        <h1 className="text-center text-4xl font-semibold sm:text-left">Stackd</h1>
        <p className="mt-2 text-center text-sm text-zinc-500 sm:text-left">
          See what your money can become.
        </p>
        {accountType && (
          <div className="mt-2 text-center sm:text-left">
            <span className="inline-block px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-400 font-medium">
              {accountType === "General" ? "Non-Registered Account" : accountType} Selected
            </span>
          </div>
        )}

        {/* Calculator card */}
        <div className="relative mt-10 overflow-hidden rounded-lg border border-zinc-800 bg-[#131326] p-6 md:p-8">
          {/* Faint green top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-violet-500/20" />

          <h2 className="mb-6 text-xl font-semibold">Calculator</h2>

          <form className="space-y-5">
            {/* Account Type — first step */}
            <div>
              <label htmlFor="account-type" className={labelClass}>
                Account Type
              </label>
              <select
                id="account-type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className={`${inputClass} cursor-pointer px-4`}
              >
                <option value="">Select an account type</option>
                <option value="TFSA">TFSA</option>
                <option value="RRSP">RRSP</option>
                <option value="FHSA">FHSA</option>
                <option value="RESP">RESP</option>
                <option value="General">Non-Registered Account</option>
              </select>
            </div>

            {/* Account Type Info Box */}
            {accountType && ACCOUNT_INFO[accountType] && (
              <div className="rounded-lg border border-violet-500/30 bg-[#09090f] p-4">
                <h3 className="mb-2 text-lg font-semibold text-violet-400">
                  {accountType === "General" ? "Non-Registered Account" : accountType}
                </h3>
                <p className="mb-2 text-sm text-zinc-300">
                  <span className="font-medium">What it is:</span>{" "}
                  {ACCOUNT_INFO[accountType].description}
                </p>
                <p className="mb-2 text-sm text-zinc-300">
                  <span className="font-medium">Contribution Limit:</span>{" "}
                  {ACCOUNT_INFO[accountType].limit}
                </p>
                <p className="text-sm text-zinc-300">
                  <span className="font-medium">Tax Advantage:</span>{" "}
                  {ACCOUNT_INFO[accountType].taxAdvantage}
                </p>
              </div>
            )}

            {/* Prompt when no account selected */}
            {!accountType && (
              <p className="text-sm text-zinc-500 mt-2">Select an account type above to get started.</p>
            )}

            {/* Account Contribution Warning */}
            {accountWarning && (
              <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">⚠️ {accountWarning}</p>
              </div>
            )}

            {/* Account contribution confirmation */}
            {accountConfirmation && (
              <div className="mt-3 p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <p className="text-sm text-violet-400">{accountConfirmation}</p>
              </div>
            )}

            {/* All other fields — locked until account type is chosen */}
            <div className={accountType ? "space-y-5" : "space-y-5 opacity-30 pointer-events-none select-none"}>
              {!accountType && (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-600">Choose an account type above to unlock the calculator.</p>
                </div>
              )}

            {/* Initial Investment */}
            <div>
              <label htmlFor="initial-investment" className={labelClass}>
                Initial Investment
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  id="initial-investment"
                  value={initialInvestment}
                  onChange={(e) => setInitialInvestment(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={`${inputClass} pl-8 pr-4`}
                />
              </div>
            </div>

            {/* Monthly Contribution — hidden for all registered account types */}
            {!["TFSA", "RRSP", "FHSA", "RESP"].includes(accountType) && (
              <div>
                <label htmlFor="monthly-contribution" className={labelClass}>
                  Monthly Contribution
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    id="monthly-contribution"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className={`${inputClass} pl-8 pr-4`}
                  />
                </div>
              </div>
            )}

            {/* TFSA-specific contribution fields */}
            {accountType === "TFSA" && (
              <>
                <div>
                  <label htmlFor="tfsa-annual-contribution" className={labelClass}>
                    Annual Contribution
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      id="tfsa-annual-contribution"
                      value={tfsaAnnualContribution}
                      onChange={(e) => setTfsaAnnualContribution(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="7000"
                      step="1"
                      className={`${inputClass} pl-8 pr-4`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    TFSA annual limit is $7,000/year. Your remaining room depends on your age and contribution history.
                  </p>
                </div>

                <div>
                  <label htmlFor="tfsa-contribution-years" className={labelClass}>
                    Years of Contribution History
                  </label>
                  <input
                    type="number"
                    id="tfsa-contribution-years"
                    value={tfsaContributionYears}
                    onChange={(e) => setTfsaContributionYears(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="30"
                    step="1"
                    className={`${inputClass} px-4`}
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    How many years have you been eligible for a TFSA? (18+ years old). Each year adds $7,000 of room.
                  </p>
                </div>

                {parseFloat(tfsaContributionYears) > 0 && (
                  <p className="text-sm text-zinc-300">
                    Your estimated total TFSA room:{" "}
                    <span className="font-semibold text-zinc-50">
                      {formatCurrency((parseFloat(tfsaContributionYears) || 0) * 7_000)}
                    </span>
                  </p>
                )}
              </>
            )}

            {/* RRSP-specific contribution fields */}
            {accountType === "RRSP" && (
              <>
                <div>
                  <label htmlFor="rrsp-annual-income" className={labelClass}>
                    Your Annual Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      id="rrsp-annual-income"
                      value={rrspAnnualIncome}
                      onChange={(e) => setRrspAnnualIncome(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className={`${inputClass} pl-8 pr-4`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    RRSP contribution limit is 18% of your previous year&apos;s income, up to $31,560/year.
                  </p>
                </div>

                {(parseFloat(rrspAnnualIncome) || 0) > 0 && (
                  <p className="text-sm text-zinc-300">
                    Your RRSP annual limit:{" "}
                    <span className="font-semibold text-zinc-50">
                      {formatCurrency(Math.min((parseFloat(rrspAnnualIncome) || 0) * 0.18, 31_560))}
                    </span>
                  </p>
                )}

                <div>
                  <label htmlFor="rrsp-annual-contribution" className={labelClass}>
                    Annual Contribution
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      id="rrsp-annual-contribution"
                      value={rrspAnnualContribution}
                      onChange={(e) => setRrspAnnualContribution(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className={`${inputClass} pl-8 pr-4`}
                    />
                  </div>
                </div>
              </>
            )}

            {/* FHSA-specific contribution fields */}
            {accountType === "FHSA" && (
              <>
                <div>
                  <label htmlFor="fhsa-annual-contribution" className={labelClass}>
                    Annual Contribution
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      id="fhsa-annual-contribution"
                      value={fhsaAnnualContribution}
                      onChange={(e) => setFhsaAnnualContribution(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="8000"
                      step="1"
                      className={`${inputClass} pl-8 pr-4`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    FHSA annual limit is $8,000/year with a $40,000 lifetime maximum. Only available to first-time home buyers.
                  </p>
                </div>

                {(parseFloat(fhsaAnnualContribution) || 0) > 0 && (parseFloat(lengthOfTime) || 0) > 0 && (
                  <p className="text-sm text-zinc-300">
                    Lifetime contributions so far:{" "}
                    <span className="font-semibold text-zinc-50">
                      {formatCurrency((parseFloat(fhsaAnnualContribution) || 0) * (parseFloat(lengthOfTime) || 0))}
                    </span>{" "}
                    of $40,000
                  </p>
                )}
              </>
            )}

            {/* RESP-specific contribution fields */}
            {accountType === "RESP" && (
              <>
                <div>
                  <label htmlFor="resp-annual-contribution" className={labelClass}>
                    Annual Contribution
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      id="resp-annual-contribution"
                      value={respAnnualContribution}
                      onChange={(e) => setRespAnnualContribution(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className={`${inputClass} pl-8 pr-4`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    RESP lifetime limit is $50,000 per child. The government adds a 20% CESG grant on the first $2,500/year (up to $500/year in free money).
                  </p>
                </div>

                {(parseFloat(respAnnualContribution) || 0) > 0 && (
                  <p className="text-sm text-zinc-300">
                    Annual government CESG grant:{" "}
                    <span className="font-semibold text-violet-400">
                      {formatCurrency(Math.min((parseFloat(respAnnualContribution) || 0) * 0.20, 500))}
                    </span>
                  </p>
                )}

                {(parseFloat(respAnnualContribution) || 0) > 0 && (parseFloat(lengthOfTime) || 0) > 0 && (
                  <p className="text-sm text-zinc-300">
                    Lifetime contributions:{" "}
                    <span className="font-semibold text-zinc-50">
                      {formatCurrency((parseFloat(respAnnualContribution) || 0) * (parseFloat(lengthOfTime) || 0))}
                    </span>{" "}
                    of $50,000
                  </p>
                )}
              </>
            )}

            {/* Length of Time */}
            <div>
              <label htmlFor="length-of-time" className={labelClass}>
                Length of Time (Years)
              </label>
              <input
                type="number"
                id="length-of-time"
                value={lengthOfTime}
                onChange={(e) => setLengthOfTime(e.target.value)}
                placeholder="1–100"
                min="1"
                max="100"
                step="1"
                className={`${inputClass} px-4`}
              />
            </div>

            {/* Estimated Annual Return */}
            <div>
              <label htmlFor="annual-return" className={labelClass}>
                Estimated Annual Return
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="annual-return"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  className={`${inputClass} pl-4 pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">%</span>
              </div>
            </div>

            {/* Compound Frequency */}
            <div>
              <label htmlFor="compound-frequency" className={labelClass}>
                Compound Frequency
              </label>
              <select
                id="compound-frequency"
                value={compoundFrequency}
                onChange={(e) => setCompoundFrequency(e.target.value as CompoundFrequency)}
                className={`${inputClass} cursor-pointer px-4`}
              >
                <option value="Annually">Annually</option>
                <option value="Semi-Annually">Semi-Annually</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Monthly">Monthly</option>
                <option value="Daily">Daily</option>
              </select>
            </div>

            </div>
          </form>

          {/* ── Results ── */}
          {results && (
            <div className="mt-8 border-t border-zinc-800 pt-8">
              <div className="space-y-6">
                {/* Projected Balance */}
                <div className="rounded-lg bg-violet-500/5 p-4">
                  <p className="mb-1 text-sm font-medium text-zinc-400 uppercase tracking-widest">
                    {accountType === "TFSA" ? "Your TFSA Projection"
                      : accountType === "RRSP" ? "Your RRSP Projection"
                      : accountType === "FHSA" ? "Your FHSA Projection"
                      : accountType === "RESP" ? "Your RESP Projection"
                      : accountType === "General" ? "Your Investment Projection"
                      : "Your Projection"}
                  </p>
                  <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">
                    Projected Balance
                  </p>
                  <p className={balanceFontSize(results.totalBalance)}>
                    <MoneyDisplay value={results.totalBalance} />
                  </p>
                </div>

                {/* Contributed + Interest */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-zinc-500">Total Amount Contributed</p>
                    <p className="text-2xl font-semibold text-zinc-50">
                      <MoneyDisplay value={results.totalContributed} />
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-zinc-500">Total Interest Earned</p>
                    <p className="text-2xl font-semibold text-zinc-50">
                      <MoneyDisplay value={results.totalInterest} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Growth Chart ── */}
          {chartData && chartData.length > 0 && (
            <div className="mt-8 border-t border-zinc-800 pt-8">
              <h3 className="mb-6 text-xl font-semibold">Growth Over Time</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 16, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorContributed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#71717a" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1939" vertical={false} />
                    <XAxis
                      dataKey="year"
                      stroke="#71717a"
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      tickLine={{ stroke: "#27272a" }}
                    />
                    <YAxis
                      stroke="#71717a"
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      tickLine={{ stroke: "#27272a" }}
                      tickFormatter={(value) => {
                        if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
                        if (value >= 1_000_000_000)     return `$${(value / 1_000_000_000).toFixed(1)}B`;
                        if (value >= 1_000_000)         return `$${(value / 1_000_000).toFixed(1)}M`;
                        if (value >= 1_000)             return `$${(value / 1_000).toFixed(0)}K`;
                        return `$${value}`;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#131326",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        color: "#e4e4e7",
                      }}
                      labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
                      labelFormatter={(label) => `Year ${label}`}
                      formatter={(value) =>
                        typeof value === "number" ? formatCurrency(value) : value
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="totalContributed"
                      stroke="#71717a"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorContributed)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalBalance"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorBalance)"
                      label={(props) => <CustomDotLabel {...props} data={chartData} />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── What If You Waited? ── */}
          {comparisonScenarios && comparisonScenarios.length > 0 && (
            <div className="mt-8 border-t border-zinc-800 pt-8">
              <h3 className="mb-2 text-xl font-semibold">What If You Waited?</h3>
              <p className="mb-6 text-xs text-zinc-500">
                Time in the market is your biggest advantage. See what waiting costs you.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {comparisonScenarios.map((scenario) => (
                    <div
                      key={scenario.label}
                      className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0d1e] p-5"
                    >
                      <p className="text-sm font-semibold text-zinc-50">{scenario.label}</p>

                      <div className="mt-4 mb-1">
                        <p className="text-xs text-zinc-500">You&apos;ll end up with</p>
                      </div>
                      <p className={`${cardNumberFontSize(scenario.totalBalance)} text-zinc-50`}>
                        <MoneyDisplay value={scenario.totalBalance} />
                      </p>

                      <hr className="my-4 border-zinc-800" />

                      {!scenario.highlight && scenario.missedAmount > 0 && (
                        <>
                          <p className="text-xs text-zinc-500">Lost Returns</p>
                          <p className={`mt-1 ${cardNumberFontSize(scenario.missedAmount)} text-red-400`}>
                            <MoneyDisplay value={scenario.missedAmount} />
                          </p>
                        </>
                      )}
                    </div>
                ))}
              </div>

              {comparisonScenarios.length >= 3 && comparisonScenarios[2].missedAmount > 0 && (
                <p className="text-sm text-zinc-400 mt-4 text-center">
                  Starting today vs waiting 10 years could cost you{" "}
                  <MoneyDisplay value={comparisonScenarios[2].missedAmount} /> in lost returns.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="pb-8 pt-8 text-center text-xs text-zinc-600">
          Stackd is for educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  );
}
