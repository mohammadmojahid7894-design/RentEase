export const uploadImage = async (file: File) => {
    console.log("Uploading started");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "rentease_upload");

    const res = await fetch(
        "https://api.cloudinary.com/v1_1/do0h1yf1h/image/upload",
        {
            method: "POST",
            body: formData,
        }
    );

    const data = await res.json();
    console.log("Final URL:", data.secure_url || data.url);
    return data.secure_url || data.url;
};