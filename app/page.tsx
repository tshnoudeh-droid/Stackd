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
  if (amount >= 100_000_000) return "text-2xl font-bold text-green-400";
  if (amount >= 1_000_000)   return "text-3xl font-bold text-green-400";
  return "text-4xl font-bold text-green-400 md:text-5xl";
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
      <circle cx={x} cy={y} r={4} fill="#22c55e" stroke="#0a0a0a" strokeWidth={2} />
      <text x={x} y={y - 12} textAnchor="middle" fill="#22c55e" fontSize={11} fontWeight="600">
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

  const results = useMemo(() => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const years = parseFloat(lengthOfTime) || 0;
    const returnRate = parseFloat(annualReturn) || 0;

    if (!isValidInputs(initial, monthly, years, returnRate)) return null;

    return calculateCompoundInterest(initial, monthly, returnRate, years, compoundFrequency);
  }, [initialInvestment, monthlyContribution, lengthOfTime, annualReturn, compoundFrequency]);

  const chartData = useMemo(() => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const years = parseFloat(lengthOfTime) || 0;
    const returnRate = parseFloat(annualReturn) || 0;

    if (!isValidInputs(initial, monthly, years, returnRate)) return null;

    return calculateYearlyData(initial, monthly, returnRate, years, compoundFrequency);
  }, [initialInvestment, monthlyContribution, lengthOfTime, annualReturn, compoundFrequency]);

  const comparisonScenarios = useMemo(() => {
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
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
  }, [initialInvestment, monthlyContribution, lengthOfTime, annualReturn, compoundFrequency]);

  const accountWarning = useMemo(() => {
    if (!accountType || accountType === "General") return null;

    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const annual = monthly * 12;
    const limits = ACCOUNT_LIMITS[accountType];
    if (!limits) return null;

    if (accountType === "RESP") {
      if (initial > 50_000) {
        return `Your initial investment of ${formatCurrency(initial)} exceeds the RESP lifetime limit of $50,000. Consider reducing your initial investment to $50,000 or less.`;
      }
      return null;
    }

    if (accountType === "FHSA") {
      if (annual > 8_000) {
        const maxMonthly = Math.floor(8_000 / 12);
        return `Your monthly contributions of ${formatCurrency(monthly)}/month (${formatCurrency(annual)}/year) exceed the FHSA annual limit of $8,000/year. Consider reducing your monthly contribution to ${formatCurrency(maxMonthly)}/month or less.`;
      }
      if (initial > 40_000) {
        return `Your initial investment of ${formatCurrency(initial)} exceeds the FHSA lifetime limit of $40,000. Consider reducing your initial investment to $40,000 or less.`;
      }
      return null;
    }

    if (limits.annualLimit !== null && annual > limits.annualLimit) {
      const maxMonthly = Math.floor(limits.annualLimit / 12);
      return `Your monthly contributions of ${formatCurrency(monthly)}/month (${formatCurrency(annual)}/year) exceed the ${accountType} annual limit of ${formatCurrency(limits.annualLimit)}/year. Consider reducing your monthly contribution to ${formatCurrency(maxMonthly)}/month or less.`;
    }

    return null;
  }, [initialInvestment, monthlyContribution, accountType]);

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-[#0a0a0a] py-3 text-zinc-50 placeholder-zinc-500 transition-colors focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50";
  const labelClass = "block text-sm font-medium mb-2 text-zinc-300";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50">
      <div className="container mx-auto max-w-2xl px-4 pt-14 pb-0 sm:px-6 lg:px-8">

        {/* Header */}
        <h1 className="text-center text-4xl font-semibold sm:text-left">Stackd</h1>
        <p className="mt-2 text-center text-sm text-zinc-500 sm:text-left">
          See what your money can become.
        </p>
        {accountType && (
          <div className="mt-2 text-center sm:text-left">
            <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-medium">
              {accountType === "General" ? "Non-Registered Account" : accountType} Selected
            </span>
          </div>
        )}

        {/* Calculator card */}
        <div className="relative mt-10 overflow-hidden rounded-lg border border-zinc-800 bg-[#1a1a1a] p-6 md:p-8">
          {/* Faint green top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-green-500/20" />

          <h2 className="mb-6 text-xl font-semibold">Calculator</h2>

          <form className="space-y-5">
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

            {/* Monthly Contribution */}
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

            {/* Account Type */}
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
              <div className="rounded-lg border border-green-500/30 bg-[#0a0a0a] p-4">
                <h3 className="mb-2 text-lg font-semibold text-green-400">
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

            {/* Account Contribution Warning */}
            {accountWarning && (
              <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">⚠️ {accountWarning}</p>
              </div>
            )}
          </form>

          {/* ── Results ── */}
          {results && (
            <div className="mt-8 border-t border-zinc-800 pt-8">
              <div className="space-y-6">
                {/* Projected Balance */}
                <div className="rounded-lg bg-green-500/5 p-4">
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
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorContributed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#71717a" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
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
                        backgroundColor: "#1a1a1a",
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
                      stroke="#22c55e"
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
                      className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] p-5"
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
