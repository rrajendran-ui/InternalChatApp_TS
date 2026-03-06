let url = ""

const uploadFile = async(file: File)=>{
    let CloudinaryUrl = "https://api.cloudinary.com/v1_1/";
    let CloudinaryName = "dr4dj9pew";
    url = `${CloudinaryUrl}${CloudinaryName}/`;
    let fileType = "raw";
    const formData = new FormData()
    formData.append('file',file)
    formData.append("upload_preset","chatapp_unsigned_preset")
if (file.type.startsWith("image/")) 
    fileType = "image"
else if (file.type.startsWith("video/")) 
    fileType = "video"
url = `${url}${fileType}/upload`;
    const response = await fetch(url,{
        method : 'post',
        body : formData
    })
    const responseData = await response.json()
    console.log(responseData)
    return responseData
}

export default uploadFile