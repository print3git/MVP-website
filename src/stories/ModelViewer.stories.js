import React from "react";
import ModelViewer from "../../js/ModelViewer.js";

export default {
  title: "ModelViewer",
  component: ModelViewer,
  argTypes: {
    url: { control: "text" },
  },
};

const Template = (args) => React.createElement(ModelViewer, args);
export const Default = Template.bind({});
Default.args = {
  url: "models/bag.glb",
};
