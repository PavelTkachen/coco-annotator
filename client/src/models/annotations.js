import axios from "axios";

const baseURL = "/api/annotation/";

export default {
  create(annotation) {
    console.log("annotation", annotation);
    return axios.post(baseURL, annotation);
  },
  delete(id) {
    console.log("id", id)
    return axios.delete(`${baseURL}${id}`);
  },
  update(id, newParams) {
    console.log("newParams", newParams)
    return axios.put(`${baseURL}${id}`, newParams);
  }
};
