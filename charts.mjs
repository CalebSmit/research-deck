import axios from "axios";

export async function quickChartPng({ labels, values, title }) {
  const config = {
    type: "bar",
    data: { labels, datasets: [{ data: values }] },
    options: { plugins: { title: { display: true, text: title } }, legend: { display: false } }
  };
  const resp = await axios.get("https://quickchart.io/chart", {
    responseType: "arraybuffer",
    params: { c: JSON.stringify(config), width: 1000, height: 520, format: "png" }
  });
  return Buffer.from(resp.data); // Node Buffer we can add as an image
}
