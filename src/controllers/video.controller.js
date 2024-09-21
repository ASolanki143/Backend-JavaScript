import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteInCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination

    const videos = await User.aggregate([
        {
            $match: {
                _id: new ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            },
        },
        {
            $unwind: "$videos",
        },
        {
            $project: {
                videos: 1,
                _id: 0,
            },
        },
    ]);

    //output of videos with unwind
    // [
    //     {
    //         "videos": {
    //             "_id": "64f5b5a10bcd6b9d7d5e2b3d",
    //             "videoFile": "http://example.com/video1.mp4",
    //             "thumbnail": "http://example.com/thumbnail1.jpg",
    //             "title": "First Video",
    //             "description": "This is the first video.",
    //             "duration": 120,
    //             "views": 100,
    //             "isPublished": true,
    //             "owner": "64f5b5a10bcd6b9d7d5e2b3c"
    //         }
    //     },
    //     {
    //         "videos": {
    //             "_id": "64f5b5a10bcd6b9d7d5e2b3e",
    //             "videoFile": "http://example.com/video2.mp4",
    //             "thumbnail": "http://example.com/thumbnail2.jpg",
    //             "title": "Second Video",
    //             "description": "This is the second video.",
    //             "duration": 150,
    //             "views": 200,
    //             "isPublished": true,
    //             "owner": "64f5b5a10bcd6b9d7d5e2b3c"
    //         }
    //     }
    // ]

    // without unwind
    // [
    //     {
    //         "videos": [
    //             {
    //                 "_id": "64f5b5a10bcd6b9d7d5e2b3d",
    //                 "videoFile": "http://example.com/video1.mp4",
    //                 "thumbnail": "http://example.com/thumbnail1.jpg",
    //                 "title": "First Video",
    //                 "description": "This is the first video.",
    //                 "duration": 120,
    //                 "views": 100,
    //                 "isPublished": true,
    //                 "owner": "64f5b5a10bcd6b9d7d5e2b3c"
    //             },
    //             {
    //                 "_id": "64f5b5a10bcd6b9d7d5e2b3e",
    //                 "videoFile": "http://example.com/video2.mp4",
    //                 "thumbnail": "http://example.com/thumbnail2.jpg",
    //                 "title": "Second Video",
    //                 "description": "This is the second video.",
    //                 "duration": 150,
    //                 "views": 200,
    //                 "isPublished": true,
    //                 "owner": "64f5b5a10bcd6b9d7d5e2b3c"
    //             }
    //         ]
    //     }
    // ]

    //there is no any videos found
    if (videos.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "No Videos there"));
    }

    //extract all videos field from output videos array
    let extractVideos = videos.map((v) => v.videos);

    //output of extract videos
    // const extractVideos = [
    //     {
    //         "_id": "64f5b5a10bcd6b9d7d5e2b3d",
    //         "videoFile": "http://example.com/video1.mp4",
    //         "thumbnail": "http://example.com/thumbnail1.jpg",
    //         "title": "First Video",
    //         "description": "This is the first video.",
    //         "duration": 120,
    //         "views": 100,
    //         "isPublished": true,
    //         "owner": "64f5b5a10bcd6b9d7d5e2b3c"
    //     },
    //     {
    //         "_id": "64f5b5a10bcd6b9d7d5e2b3e",
    //         "videoFile": "http://example.com/video2.mp4",
    //         "thumbnail": "http://example.com/thumbnail2.jpg",
    //         "title": "Second Video",
    //         "description": "This is the second video.",
    //         "duration": 150,
    //         "views": 200,
    //         "isPublished": true,
    //         "owner": "64f5b5a10bcd6b9d7d5e2b3c"
    //     }
    // ];

    // filter extract videos based on query
    if (query) {
        extractVideos = extractVideos.filter(
            (v) =>
                v.title.toLowerCase().includes(query) || v.title.includes(query)
        );
    }

    // sort extract videos
    if (sortBy && sortType) {
        extractVideos.sort((a, b) => {
            if (sortType === "asc") {
                return a[sortBy] > b[sortBy] ? 1 : -1;
            } else {
                return a[sortBy] < b[sortBy] ? 1 : -1;
            }
        });
    }

    // create pagenate function for return particular videos
    const paginate = (page, limit, videos) => {
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        return videos.slice(startIndex, endIndex);
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                paginate(page, limit, extractVideos),
                "Videos fetch successfully"
            )
        );
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and Description are required");
    }

    const videoFileLocalPath = req?.files?.videoFile[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file can not upload on clodinary");
    }

    const thumbnailFileLocalPath = req?.files?.thumbnailFile[0]?.path;

    if (!thumbnailFileLocalPath) {
        throw new ApiError(400, "Thumbnail file is required");
    }

    const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);

    if (!thumbnailFile) {
        throw new ApiError(400, "Thumbnail file can not upload on clodinary");
    }

    const video = await Video.create({
        videoFile: videoFile?.url,
        thumbnail: thumbnailFile?.url,
        title,
        description,
        duration: videoFile?.duration,
        owner: req.user?._id,
    });

    if (!video) {
        throw new ApiError(500, "Video cannot save in database");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video upload successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    res.status(200).json(
        new ApiResponse(200, video, "Video found successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not the owner of this video");
    }

    const deleteOldThumbnail = await deleteInCloudinary(video.thumbnail);

    if (deleteOldThumbnail.result !== "ok") {
        throw new ApiError(500, "Failed to delete thumbnail");
    }

    const newThumbnailFileLocalPath = req?.file?.path;

    if (!newThumbnailFileLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const newThumbnail = await uploadOnCloudinary(newThumbnailFileLocalPath);

    if (!newThumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: newThumbnail?.url,
            },
        },
        {
            new: true,
        }
    );

    if (!updateVideo) {
        throw new ApiError(500, "Failed to update video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findById(videoId);

    if (video.owner.toString() !== req?.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this video");
    }

    const videoDelete = await deleteInCloudinary(video.videoFile);

    if (videoDelete.result !== "ok") {
        throw new ApiError(500, "Failed to delete video from cloudinary");
    }

    const thumbnailDelete = await deleteInCloudinary(video.thumbnail);

    if (thumbnailDelete.result !== "ok") {
        throw new ApiError(500, "Failed to delete thumbnail from cloudinary");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
        throw new ApiError(500, "Failed to delete video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req?.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this video");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedVideo,
                "Video publish status updated successfully"
            )
        );
});

export {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishVideo,
    togglePublishStatus,
    updateVideo,
};
