# trim spaces out of csv columns

BEGIN {
  FS="[[:space:]]*,[[:space:]]*"    # split records, absorbing spaces around comma
  OFS=","
}
{ 
  sub(/^[[:space:]]*/, ""); # drop leading space in first record
  $1 = $1;                  # rebuild record with new OFS
  print $0;
}