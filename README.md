# Plot app v2

## About

This variant utilizes web workers for processing the data and IndexedDB for storing raw upload & processed data to be then sent to frontend.

Very rough on the edges:

- Low quality UI
- No error handling
- No form validation
- Only happy path verified to work (ex. wont work for small files, though example.csv is fine)
- No more beautiful gradual update of the graph. :( Only based on interval setting.

Generally this is just to confirm if that was the direction you wanted to see. If you expected to see something else, like even without web workers, let me know! I realize it may be a little overkill for this purpose but who knows.

## Quick start

1. Clone or download, then `npm install`, then `npm run dev`

2. Open `localhost:3000`

3. Upload your CSV or use "Test mode"

4. Set your desired `N`, `T`, `P` and `S` or leave the defaults

5. Wait for data processing and click `Start`

## Example CSV format:

```

0,-0.028733515256167692

1,0.002802245633516866

2,0.03190477324749414

3,0.030729641289156617

4,0.017374581341199485

5,0.05722880107852703

6,0.03166829951665237

7,0.03324601911350197

8,0.017923827351765093

9,-0.026738180448497212

10,0.014236533920869071

...

```
