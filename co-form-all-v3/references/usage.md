# co-form 使用参考

## 1. 安装与注册

### 1.1 发布包接入

```javascript
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import CoFormV3 from '@zszc/co-form-v3'
import '@zszc/co-form-v3/dist/style.css'

const app = createApp(App)

app.use(ElementPlus, { locale: zhCn })
app.use(CoFormV3, {
  locale: zhCn,
  fileSrc(filename) {
    // 文件类控件回显时，用它把字符串值转成可展示对象
    return Promise.resolve({
      src: `/files/${filename}`,
      name: filename
    })
  }
})
```

### 1.2 组件内基本用法

```vue
<template>
  <co-form
    ref="formRef"
    :form-list="formList"
    :form-data="formData"
    @event="onFormEvent"
  />
</template>

<script setup>
import { ref } from 'vue'

const formRef = ref()
const formData = ref({})
const formList = ref([
  {
    id: 'name',
    name: '姓名',
    type: 'input',
    required: true
  },
  {
    id: 'email',
    name: '邮箱',
    type: 'input',
    validate: 'email'
  }
])

function onFormEvent(item, value, newFormData) {
  console.log(item, value, newFormData)
}
</script>
```

## 2. 常用 props

| 字段 | 说明 |
| --- | --- |
| `formList` | 表单配置数组，是核心 DSL |
| `formData` | 初始值或回显值 |
| `shareData` | 多个 co-form 联动时共享数据源 |
| `setData` | 提交时额外合并的数据 |
| `dictConfig` | 动态字典容器，配合 `dicKey` 使用 |
| `labelWidth` | 标签宽度 |
| `labelPosition` | 标签位置 |
| `isLabel` | 是否显示标签 |
| `inline` | 是否行内表单 |
| `size` | 表单尺寸 |

## 3. formList 最小字段模型

优先使用下面这组最小字段起步：

```javascript
const formList = [
  {
    id: 'userName',
    name: '用户名',
    type: 'input',
    required: true
  },
  {
    id: 'mobile',
    name: '手机号',
    type: 'input',
    validate: 'phone2'
  },
  {
    id: 'status',
    name: '状态',
    type: 'select',
    list: [
      { value: 1, text: '启用' },
      { value: 0, text: '停用' }
    ]
  }
]
```

常见字段含义：

| 字段 | 说明 |
| --- | --- |
| `id` | 数据字段，支持 `a.b` 形式 |
| `uid` | 提交时改用该字段作为返回键 |
| `name` | 标签文本 |
| `type` | 组件类型 |
| `placeholder` | 占位文案 |
| `attributes` | 透传给 Element Plus 组件的属性 |
| `list` | 下拉、单选、复选数据源 |
| `dicKey` | 从 `dictConfig` 读取字典 |
| `required` | 必填规则，可为布尔、对象或数组 |
| `relation` | 显隐联动规则 |
| `validate` | 校验规则，可用内置字符串、对象或函数 |
| `children` | 组合输入项 |
| `slot` | 自定义插槽名 |
| `rowSlot` | 行尾插槽名 |

## 4. 事件与 ref 方法

### 4.1 事件

`@event="onFormEvent"` 的三个参数固定为：

| 参数 | 说明 |
| --- | --- |
| `item` | 当前表单项 |
| `value` | 当前变更后的值 |
| `newFormData` | 内部处理后的整份数据 |

### 4.2 ref 方法

```javascript
// 获取并校验整表
await formRef.value.getFormData(opt)

// 获取单个或全部字段，不校验
formRef.value.getFormDataKey(id, opt, isPromise)

// 获取内部 newFormData
formRef.value.getNewFormData()

// 更新某个字段，可选择是否清空校验状态
formRef.value.setFormDataKey(id, value, isClearValidate)

// 更新某个字段的候选列表，可选择是否清空当前值
formRef.value.setFormListData(id, list, isClearValue)

// 手动触发某字段校验
formRef.value.setValidateField(id)
```

`getFormData(opt)` 常用选项：

| 选项 | 说明 |
| --- | --- |
| `isFile` | 文件字段只返回 `file` 对象 |
| `isFileOrigin` | 非 `file` 对象时返回原始传入值 |
| `isFileUid` | 文件值绑定到 `uid` 或 `id` |
| `setIds` | 追加返回指定字段 |
| `default` | 合并额外默认数据 |

## 5. 插槽写法

组件支持在配置项里声明 `slot` 或 `rowSlot`，再在模板中按名称实现：

```vue
<co-form
  ref="formRef"
  :form-list="formList"
  :form-data="formData"
>
  <template #zdySlot="{ row, data }">
    <el-input v-model="data[row._id]" placeholder="请输入插槽值" />
  </template>

  <template #rowSlot>
    右侧插槽
  </template>
</co-form>
```

注意：

- 插槽里的 `data` 是内部 `newFormData`，优先直接绑它。
- 不建议直接替换整个 `data` 对象，局部更新可改用 `setFormDataKey`。

## 6. 文件与图片类控件

文件类字段依赖安装时注入的 `fileSrc`：

- 当 `formData` 里传的是文件名、文件 ID、地址字符串时，组件会尝试解析。
- 如果既不是 `File` 对象，也不是完整链接，通常会调用 `fileSrc` 向外拿到 `{ src, name }`。
- 需要文件名回显时，优先传对象而不是裸字符串，例如：

```javascript
const formData = {
  attachment: {
    src: '/files/demo.docx',
    usrc: 'demo.docx'
  }
}
```

上传字段的 `upload` 常见能力：

| 字段 | 说明 |
| --- | --- |
| `tip1` | 未选择文件时提示 |
| `t2` | 选择文件后的提醒文字 |
| `upType` | 允许的文件格式 |
| `sizeMax` | 最大体积，单位 MB |
| `tips` | 附加提示 |
| `isBtn` | 是否用按钮触发选择 |
| `isName` | 是否显示文件名 |

## 7. 联动与校验

### 7.1 `required` / `relation`

两者都支持：

- `Boolean`
- `Object`
- `Array<Object>`

对象规则常见结构：

```javascript
{
  id: 'status',
  val: [1, 2]
}
```

或：

```javascript
{
  id: 'status',
  noVal: 0
}
```

补充字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 读取组件内部值 |
| `oid` | 读取原始 `formData` 值 |
| `val` | 命中条件 |
| `noVal` | 排除条件 |
| `isWatch` | 是否监听外部共享数据变化 |
| `some` | 数组条件是否改为任一满足即通过 |

### 7.2 内置 `validate`

可直接使用这些字符串：

- `number`
- `money`
- `moneyTenThousand`
- `phone`
- `phone2`
- `email`
- `isIdentityId`
- `checkSocialCreditCode`
- `chinese`
- `noChinese`

## 8. 实战建议

- 优先复用仓库 `src/views/forms/index.vue` 和 `src/views/forms/data.js` 的字段组织方式。
- 写业务页时，先让 `formList` 结构稳定，再逐个加联动与校验，避免一开始把所有特性堆在一起。
- 如果用户只要求“增加一个字段”，优先在现有 `formList` 增量修改，不要重写整份配置。
- 如果要扩展组件能力，先同步检查 `src/components/co-form/README.md` 与 `src/components/co-form/version/` 约定，保持文档版本一致。
