# Plot app

![image](https://github.com/user-attachments/assets/c248d48a-423e-4d27-b6d2-ad45c055f497)

#### Overview

This take-home assignment showcases my ability to develop a performant frontend and backend data streaming application using React and Next.js. The project focuses on optimizing data streaming, which may have impacted overall code quality, but given the time constraints, I am proud of the results despite potential bugs.

#### Frontend Implementation

The frontend part of the application is implemented in React and makes use of hooks and memoization for optimal performance. Here is a brief overview of its key components and functionalities:

1.  **Graph Component**: Utilizes the `Dygraph` library for rendering real-time data on a graph. It is initialized and updated with the data points provided by the backend.
2.  **Controls Component**: Provides user interface elements to configure various settings like data interval, display points, points per interval, test mode, and offset. It also handles file uploads.
3.  **Data Streaming and Preloading**: Data streaming is initiated and controlled through the use of the `EventSource`API. Preloaded data is managed via a queue to ensure smooth and continuous updates to the graph.
4.  **State Management**: State variables are used extensively to manage data points, settings, and streaming states. Hooks such as `useState`, `useRef`, `useCallback`, and `useMemo` are utilized for efficient state management and performance optimization.
5.  **Dynamic Downsampling**: Downsampling logic is implemented to ensure that the graph displays data points efficiently, even when dealing with large datasets.

#### Backend Implementation

The backend part of the application is built using Next.js API routes. Here are the primary functionalities it provides:

1.  **Data Generation and Streaming (GET /api/data)**: This endpoint generates and streams data points in real-time. It supports both test mode (generating random data) and file-based data streaming. Downsampling is applied to optimize the amount of data sent to the client.
2.  **File Upload (POST /api/data)**: This endpoint handles file uploads and stores the uploaded data in a CSV format. It converts the web stream to a Node.js stream for efficient file handling.
3.  **Downsampling Logic**: The backend includes an optimized downsampling function that reduces the number of data points sent to the client, minimizing bandwidth usage and ensuring smooth graph rendering.

#### Highlights and Considerations

- **Optimization Focus**: The primary focus of this project was to optimize data streaming to provide a smooth user experience, especially when handling large datasets or real-time data.
- **Potential Bugs**: Due to the emphasis on optimization and time constraints, some areas of the code may contain bugs or lack polish. Nonetheless, the core functionality demonstrates the intended performance improvements.
- **Performance Trade-offs**: While the code may not adhere strictly to best practices in some areas, the performance gains achieved through optimization were a priority for this assignment.

#### How It Works

1.  **Preloading Data**: When the application starts, it preloads data from the backend based on the configured settings. This data is used to initialize the graph.
2.  **Data Streaming**: Upon starting the data streaming, the frontend requests data from the backend at specified intervals. The backend generates or reads data, applies downsampling, and streams it to the frontend.
3.  **Graph Updating**: The frontend receives the streamed data, processes it, and updates the graph in real-time. The downsampled data ensures that the graph remains responsive and performant.

In summary, this project demonstrates my ability to build a performant and optimized data streaming application using modern web technologies, with a strong focus on achieving smooth real-time data visualization.

### Quick tutorial

1. Clone or download, then `npm install`, then `npm run dev`

2. Open `localhost:3000`

3. Upload your CSV or use "Test mode"

4. Set your desired `N`, `T`, `P` and `S` or leave the defaults

5. Click `Start`

### Example CSV format:

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
