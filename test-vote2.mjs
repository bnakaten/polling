const token = "172afe2a4316b398d363d484c5f611e0839f7150bca7bc549360c595017e9f2c";

const formData = new FormData();
formData.append("token", token);

fetch("http://localhost:3000/api/vote/submit", {
  method: "POST",
  body: formData,
})
  .then(res => res.json())
  .then(data => {
    console.log("Status:", res.status);
    console.log("Response:", data);
  })
  .catch(err => {
    console.error("Fetch error:", err);
  });
