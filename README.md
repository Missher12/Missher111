# STAFFTool - 企业级人力资源及考勤管理系统开发规范

本系统致力于为中大型企业提供高效的人力资源管理（HR）、报名招生数据处理、现场签到以及多维度考勤报表统计。为保障项目的长期可维护性、高可用性及团队协作效率，特制定本前端架构规范指南。

---

## 一、企业级文件结构规范

本系统基于组件高复用、领域限界上下文清晰的原则，废除了混沌的扁平结构，将业务模块进行深度企业级分类。核心目录结构规范如下：

### 1. 核心目录定位与命名规则
- **`src/`**：项目核心源码根目录。
- **`src/components/`**：统一存放业务与通用视图组件。
- **`src/components/Staff/`**：凡与在职员工、花名册、外协导入等相关的人员域管理组件，均存放在此处。
- **`src/components/Attendance/`**：凡与考勤、签到、请假录入、现场签到等事件流相关的组件均存放在此处。
- **`src/components/Interview/`**：处理应聘人员、招聘阶段、面试待办、面试看板等生命周期的专用子集。
- **`src/components/Auth/`**：存放身份鉴权、企业级登录、权限认证等。
- **`src/components/System/`**：企业级基础设置、公告下发、敏感字过滤及全局环境设置。
- **`src/components/Dashboard/`**：核心 workbench 工作台，承载数据大屏、实时看板和图表统计。
- **`src/services/`**：所有系统网络/异步请求、模型代理服务、第三方底层 SDK 加载逻辑集中于此。
- **`src/utils/`**：系统通用无状态纯函数工具库，严格遵循静态化、可测试性指标。

### 2. 目录树结构示例
```text
.
├── App.tsx                     # 应用程序核心宿主组件
├── index.html                  # 单页面应用引导主页面
├── index.tsx                   # 应用挂载入口起点
├── package.json                # 项目依赖及自动化构建命令定义
├── types.ts                    # 共享领域模型 TypeScript 类型声明
├── utils.ts                    # 全局基础公共纯工具函数
└── components/                 # 分类限界业务组件域
    ├── Auth/
    │   └── Login.tsx           # 多角色极简鉴权入口组件
    ├── Dashboard/
    │   └── Dashboard.tsx       # 考勤动态智能工作台 (支持 Recharts 数据图)
    ├── Staff/
    │   ├── AllStaffOverview.tsx # 组织内部所有成员花名册
    │   ├── OutsourcedManager.tsx # 外协临时机动人员调度
    │   ├── PublicRegistrationForm.tsx # 面试、入职外部申请快速通道
    │   ├── StaffDashboard.tsx  # 员工个人主视角打卡信息系统
    │   ├── StaffManager.tsx    # 员工档案及多权限管控层
    │   └── StaffRegistration.tsx # 档案数据集中导入和排重组件
    ├── Attendance/
    │   ├── Attendance.tsx      # 人脸/扫码上班打卡物理底层
    │   ├── AttendanceReports.tsx # 分组排班、月度考勤明细与报表生成
    │   ├── CheckInSystem.tsx   # 现场快速核验系统
    │   ├── LeaveManager.tsx    # 请假调休假期流审批器
    │   └── TrainingCheckinManager.tsx # 训战报名及排班中间调度
    ├── Interview/
    │   ├── Interview.tsx       # 面试官阶段评价打分器
    │   ├── IntervieweeDashboard.tsx # 候选人排队等待可视化客户端
    │   └── TalentPool.tsx      # 企业自建本地中转人才池
    └── System/
        ├── AnnouncementManager.tsx # 公告置顶、群发推送器
        └── SystemSettings.tsx  # 基础阈值、考勤偏移及导出等选项
```

---

## 二、API接口统一方案

为实现前后端深度解耦，彻底告别零散的原生请求，整个系统遵循统一的 API 底座设计原则，确保错误能够全局拦截、类型强约束。

### 1. 设计原则
- **请求封装**：基于 Promise 的统一客户端服务，统一注入 Header、签名与 RequestId。
- **错误全局捕获**：提供通用的 HTTP Status 与自定义企业级业务 Error Code 拦截机制。
- **一致的数据响应**：在服务层强制返回统一的实体架构：`{ code: number, data: T, message: string }`。

### 2. API 模块与调用示例
```typescript
import { Staff, AttendanceRecord } from '../types';

// 定义标准响应格式
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 统一请求底层框架代理
 */
async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'STAFF-WEB-PORTAL',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options?.headers },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: Status ${response.status}`);
    }

    const json = await response.json();
    return json as ApiResponse<T>;
  } catch (error) {
    console.error(`[API Network Error] ${url}:`, error);
    return {
      code: 500,
      data: null as unknown as T,
      message: error instanceof Error ? error.message : '服务器通信出现异常'
    };
  }
}

/**
 * 统一员工领域接口模块
 */
export const StaffApi = {
  /**
   * 获取在职主力成员全表
   */
  async getStaffList(): Promise<ApiResponse<Staff[]>> {
    return request<Staff[]>('/api/v1/staff/list', {
      method: 'GET',
    });
  },

  /**
   * 提交上班/下班考勤指纹
   */
  async createAttendance(record: Partial<AttendanceRecord>): Promise<ApiResponse<AttendanceRecord>> {
    return request<AttendanceRecord>('/api/v1/attendance/punch', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }
};
```

---

## 三、项目文档更新指南

对于项目文档的维护必须做到高保真并严格执行敏捷记录。凡有接口修改、模块变更、目录重构，均需在 `README.md` 中进行实时归档。

### 1. 文档更新强制要素
- **系统架构图/说明**：变更核心依赖后必须补充对打包和体积的影响。
- **新接口注册**：任何新上线的 API，必须在文档的 “接口清单” 中注册其 URL、入参及响应格式。
- **版本记录与迭代日志**：版本迭代须明确具体修改点、影响范围及升级时间。

### 2. README.md 迭代日志片段示例
```markdown
### 历史迭代与发布记录

| 版本号 | 更新时间 | 核心修改说明 | 修复缺陷与优化点 | 维护责任人 |
| :--- | :--- | :--- | :--- | :--- |
| v1.0.0 | 2026-06-17 | 新增企业级组件限界架构划分 | 彻底修复 setForms 未定义的 React 悬空异常；优化工作台看板整体视觉质感 | 资深前端架构师 |
| v0.9.0 | 2026-05-15 | 引入多区域考勤快速通道与签到 | 修复多端浏览器缓存下状态重写失效的问题 | 开发团队 |

### 系统接口注册目录索引

1. **员工控制域**
   - `GET /api/v1/staff/list` 获取在册全量人员名单
   - `POST /api/v1/staff/create` 录入员工基础花名册
2. **考勤控制域**
   - `POST /api/v1/attendance/punch` 上传定位与影像进行打卡
   - `GET /api/v1/attendance/export` 导出月度出勤、排班差错明细
```

---

## 四、数字格式校验规则

为避免数据孤岛以及数据库底层在索引联合查询、聚合统计时，由于文本连字符（如杠 `-`）产生解析差错或类型不兼容，**本系统严格禁止任何形式的数字内混用连字符格式（如ID、版本号、电话号码）**。

### 1. 全局设计规定
- **电话号码**：必须为连续的非断开纯数字串（如长度 11 位的标准中国手机号）。
- **标识 ID 符**：所有生成的业务纯数字类关联 ID，必须采用纯数值编码表示。
- **系统版本代号（仅限包含连字符场景修改）**：版本号中的数字字段不允许出现连字符（如版本数字代号一律改用标准的 "." 隔开方案）。

### 2. 检测与修正正则表达式
利用以下高可靠性正则模型，可快速检测并提取去除数字流内部不规范的连字符。

```javascript
// 检测带有连字符的异常数字或电话格式 (例如包含数字中间的 - )
const badNumberPattern = /(\d+)-+(\d+)/g;

/**
 * 校验纯硬度数字去格式化转化器
 * 示例: "135-0000-0000" => "13500000000"
 */
function cleanNumericFormat(inputValue) {
  if (typeof inputValue !== 'string') return inputValue;
  // 全局匹配数字中间的任何连字符并用空字符进行抹平移除
  return inputValue.replace(badNumberPattern, '$1$2');
}
```

### 3. 不规范格式修正常见示例对比

#### 示例 A：电话号码入参格式转化
- **不合格形式** (携带中隔短横线):
  `"188-5111-2045"` (无效)
- **修正后形式** (标准连续纯数串):
  `"18851112045"` (有效合格)

#### 示例 B：系统流水、配置编号或大版本编码
- **不合格形式** (混杂连字符降低比对效率):
  `"ID-2026-0617"` 或 `"Version-1-0-2"`
- **修正后形式** (利用标识点或扁平化数值表达):
  `"ID20260617"` 或 `"Version.1.0.2"`
