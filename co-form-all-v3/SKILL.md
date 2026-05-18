---
name: co-form-all-v3
description: 复用 @zszc/co-form-v3（仓库目录名 co-form-all-v3）动态表单组件的接入与使用规范。需要在 Vue 3 + Element Plus 项目中引入 co-form、编写 form-list / form-data、处理 event 事件、调用 ref 暴露方法、接入文件回显 fileSrc，或补充该组件示例与使用文档时使用此 skill。
---

# Co-Form-All-V3

## 概览

按以下顺序工作，避免凭印象接入组件：

1. 先确认项目是通过 `app.use(插件)` 全量注册，还是直接按需注册 `CoForm` / `co-form`。
2. 优先复用仓库内现有示例和字段约定，不要重新设计一套 DSL。
3. 先写最小可运行示例，再补充复杂项，如联动校验、插槽、自定义上传。
4. 需要字段细节、ref 方法、上传规则、插槽约定时，读取 [references/usage.md](./references/usage.md)。

## 快速流程

### 1. 确认接入方式

- 发布包接入：使用 `@zszc/co-form-v3` 和 `@zszc/co-form-v3/dist/style.css`。
- 仓库本地调试：优先参考 `src/components/index.js` 与 `src/views/forms/index.vue` 的现有接法。
- 文件类控件存在时，务必确认 `fileSrc` 已注入，否则文件回显和链接解析会不完整。

### 2. 组织最小示例

- 在页面内准备 `formRef`、`formList`、`formData`。
- 模板中使用 `<co-form ref="formRef" :form-list="formList" :form-data="formData" @event="onFormEvent" />`。
- `formList` 先只放 `id`、`name`、`type`、`required` 等核心字段，再逐步增加 `validate`、`relation`、`children`。

### 3. 处理交互与取值

- 实时联动走 `@event`。
- 提交取值优先用 `await formRef.value.getFormData(opt)`。
- 局部更新使用 `setFormDataKey`、`setFormListData`，不要直接篡改内部 `newFormData`。

### 4. 扩展复杂场景

- 插槽、自定义行尾内容、文件上传、多值下拉、条件显隐等高级能力，统一参考 [references/usage.md](./references/usage.md)。
- 遇到字段配置不明确时，先查仓库 `src/components/co-form/README.md` 与 `src/views/forms/` 示例，不要臆造属性名。

## 执行约束

- 使用纯 JavaScript，不写 TypeScript 语法。
- 保持 Vue 3 + Element Plus 写法，与现有组件命名、字段命名保持一致。
- 写示例时补充必要注释，说明 `form-list` 字段含义、事件参数和 ref 方法用途。
- 如果新增的是项目内说明文档，优先把组件使用方式放到页面级或组件级相邻文档，避免散落。

## 参考资料

- 详细用法： [references/usage.md](./references/usage.md)
