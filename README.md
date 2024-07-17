# Plot app

### How to run?

Clone or download, then `npm install`, then `npm run dev`

Open `localhost:3000`

### How to use?

Upload your CSV or use "Test mode"

Example CSV format:

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

Set your desired `N`, `T`, `P` and `S` or leave the defaults

Click `Start`

### It could be more pretty

Correct but given the specifics of the task I decided to focus on, and dive deeper into client-side performance optimization by moving most of data manipulation part to server side

### What else could be done here?

1. As said - UI/UX, MaterialUI, more transitions, more animations
2. Consider using `dygraphs` built in range selector instead of custom data manipulation
3. Consider ditching `dygraphs` in favor of `d3js` or similar for further performance improvement
4. Deployment, but that would require some hardening also there supposedly is a 5MB limit on data upload on Vercel anyway
5. Form validation and sanitization, for example T min of 16
6. Simplify the code A LOT
