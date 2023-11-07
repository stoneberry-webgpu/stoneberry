BEGIN { 
  summaryOut = "bench-summary-" date ".csv";
  detailsOut = "bench-details-" date ".csv";
} 
/## Summary/ { summary = 1; next }
!summary { print $0 > detailsOut }
summary { print $0 > summaryOut }
