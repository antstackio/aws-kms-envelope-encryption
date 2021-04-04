import React, { useState, useEffect } from "react";
import axios from "axios";
import * as FormData from "form-data";

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    getData();
  }, []);

  const getData = async () => {
    try {
      const resData = await axios.get("http://localhost:8080/");
      setData(resData.data.records);
    } catch (error) {
      alert("Some error occured while get the listings");
    }
  };

  const uploadFile = async (event) => {
    event.preventDefault();

    setIsUploading(true);
    let formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("http://localhost:8080/upload/", formData);
      setIsUploading(false);
      getData();
    } catch (error) {
      alert("Some error occured while uploading the file");
    }
  };

  const downloadFile = async (id) => {
    try {
      const fileRes = await axios.post("http://localhost:8080/download/", {
        fileId: id,
      });

      const url = window.URL.createObjectURL(
        new Blob([Buffer.from(fileRes.data.file.data, "binary")])
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileRes.data.fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      alert("Some error occured while downloading the file");
    }
  };
  return (
    <div className="container">
      <div className="row text-center mt-5 mb-5">
        <div className="col my-auto">
          <input
            type="file"
            className="form-control"
            id="fileUpload"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <div className="col my-auto">
          {isUploading ? (
            <button className="btn btn-primary" type="button" disabled>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Uploading...
            </button>
          ) : (
            <button
              type="button"
              onClick={uploadFile}
              className="btn btn-primary"
            >
              Upload
            </button>
          )}
        </div>
      </div>
      <div className="row">
        <table className="table text-center">
          <thead>
            <tr>
              <th scope="col">File Id</th>
              <th scope="col">Name</th>
              <th scope="col">Download</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <th scope="row">{item.id}</th>
                <td>{item.fileName}</td>
                <td>
                  <button
                    className="btn btn-outline-primary"
                    type="button"
                    onClick={() => downloadFile(item.id)}
                  >
                    ⬇
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
