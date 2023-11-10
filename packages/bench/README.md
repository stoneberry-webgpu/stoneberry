### Basic Use
Run the default benchmark configuration and save committed versions.
* current default config is: 100 runs, batch size 50, report median fastest
* ```sh
    pnpm bench 
    ```
* results are logged to the debug console and git committed versions 
  accumulate in `benchmarks.csv` to track results over time
* automatically launches the browser


### Detailed Analysis
Run the default benchmark configuration and save all run details to a .csv file,
suitable for further analysis
* ```sh
    pnpm bench:details
    ```
* results are logged to the debug console and written to `benchmarks-details.csv`

Convert the `benchmarks-details.csv` into files appropriate for the tableau dashboard
* ```sh
    pnpm bench:dashcsv
    ```
* `bench:dashcsv`` creates two files: `bench-details-{date}.csv`, `bench-summary-{date}.csv`.
* If a baseline is defined, creates two more files: 
  `compare-details-{date}.csv` and `merged-summary-{date}.csv`.

To look at the current results with tableau:
* Copy the tableau dashboard from: 
  https://public.tableau.com/app/profile/mighdoll/viz/shaderbenchmarking/Dashboard
* Add the details file to tableau
  * see Data Source > details > Edit Connection
  * add this file `bench-details-{date}.csv`, and drag the file onto the 'drag tables here' area
* Note that only the `details-only` tab will work in tableau unless there is a baseline.

To compare with a baseline and activate the full dashboard, save a baseline 
  before running `bench:dashcsv`:
* ```sh
  cp bench-details-2023-Nov-09_12-53-48.csv baseline-details.csv
  cp bench-summary-2023-Nov-09_12-53-48.csv bench-baseline-summary.csv 
  ```

Then enter the merged/compare files into tableau (instead of `bench-details-*.csv` or `bench-summnary-*.csv`):
* See Data Source > summary > Edit Connection
  * use `merged-summary-{date}.csv`.
* See Data Source > details > Edit Connection
  * use both: `compare-details-{date}.csv` and `merged-summary-{date}.csv`.
  * relate the two files with the `gitVersion` field
* The entire dashboard should work.

### Variations

Run the default configuration and save a temporary .csv file
* ```sh
    pnpm bench:dev 
    ```
* results are logged to the debug console and accumulate in `benchmarks-dev.csv` 
  regardless of git commit status. 

Just launch Chrome configured for benchmarking:
* ```sh
    pnpm bench:browser
    ```
Run the default benchmark configuration and log to console w/o saving a csv file
* ```sh
    pnpm dev 
    ```
* automatically launches the browser