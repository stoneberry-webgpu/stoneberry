BEGIN {
  header = ""
}
{
  if ($0 != header) {
    print $0;
    if (header == "") {
      header = $0;
    }
  }
}