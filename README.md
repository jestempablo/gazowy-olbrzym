
# Plot app

![image](https://github.com/user-attachments/assets/c248d48a-423e-4d27-b6d2-ad45c055f497)

## Quick start

1. Clone or download, then `npm install`, then `npm run dev`
2. Open `localhost:3000`
3. Upload your CSV or use "Test mode"
4. Set your desired `N`, `T`, `P` and `S` or leave the defaults
5. Click `Start`

## About
   
**Overview**

This project demonstrates my ability to develop a performant frontend and backend data streaming application using React and Next.js, with a focus on optimizing data streaming and real-time data visualization.

**Frontend**

-   **Framework & Tools**: React with hooks, Dygraph library.
-   **Graph Component**: Initialized and updated with backend data, using memoization for performance.
-   **Controls Component**: Configures settings like data interval, display points, and handles file uploads with debounce and validation.
-   **Data Streaming**: Managed via EventSourceAPI and preloaded data in a queue for smooth updates.
-   **State Management**: Efficiently handled with hooks (useState, useRef, useCallback, useMemo).
-   **Dynamic Downsampling**: Ensures efficient display of large datasets, with potential for manual downsample rate adjustments.

**Backend**

-   **Framework**: Next.js with API routes.
-   **Endpoints**:

1.  **Data Generation and Streaming (GET /api/data)**: Streams real-time data, supports test mode and file-based streaming with downsampling.
2.  **File Upload (POST /api/data)**: Handles file uploads, stores data in CSV format, converts to Node.js stream for efficiency.

-   **Downsampling Logic**: Optimized function to reduce data points, minimizing bandwidth and ensuring smooth graph rendering.

**Highlights and Considerations**

-   **Optimization Focus**: Prioritized smooth user experience with large datasets and real-time data.
-   **Potential Bugs**: Due to time constraints, some bugs may exist, but core functionality is robust.
-   **Performance Trade-offs**: Optimization took precedence over strict adherence to best practices.

**How It Works**

1.  **Preloading Data**: Initializes graph with preloaded backend data based on settings.
2.  **Data Streaming**: Frontend requests data at intervals, backend streams or generates data, applies downsampling, and sends to frontend.
3.  **Graph Updating**: Frontend processes and updates graph in real-time with downsampled data for responsiveness.


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

## Todos

1. Tests
2. Deployment
3. Make sure to handle out of range float values
