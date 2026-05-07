/**
 * ECharts 按需导入模块
 * 替代 `import * as echarts from 'echarts'` 的全量导入（~800KB）
 * 只注册项目实际使用的组件，减少约 60-70% 体积
 */
import * as echarts from 'echarts/core';

// 图表类型（项目中使用到的）
import { BarChart, LineChart, PieChart } from 'echarts/charts';

// 组件（按实际使用注册）
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkPointComponent,
    MarkAreaComponent,
    GraphicComponent
} from 'echarts/components';

// 渲染器（Canvas 适用于移动端）
import { CanvasRenderer } from 'echarts/renderers';

// 注册所有使用到的组件
echarts.use([
    BarChart,
    LineChart,
    PieChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkPointComponent,
    MarkAreaComponent,
    GraphicComponent,
    CanvasRenderer
]);

// 导出注册完毕的 echarts 实例
export default echarts;

// 单独导出 graphic 以便直接使用 LinearGradient
export const { graphic } = echarts;
