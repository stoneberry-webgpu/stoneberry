/## Summary/ { summary = 1; next }
!summary { print $0 > "benchmarks-details-only.csv" }
summary { print $0 > "benchmarks-summary.csv" }
