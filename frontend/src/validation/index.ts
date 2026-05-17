// Response schemas (with transform: snake_case → camelCase)
export { CommentApiSchema, CommentListApiSchema, CommentRepliesApiSchema, ToggleLikeApiSchema, CommentVersionsApiSchema } from './schemas/comment';
export { UserApiSchema } from './schemas/user';
export { VideoApiSchema, VideoListApiSchema } from './schemas/video';
export { PlaylistApiSchema, PlaylistListApiSchema } from './schemas/playlist';
export { VideoSummaryApiSchema } from './schemas/summary';
export { VideoTranscriptionApiSchema } from './schemas/transcription';
export { ChannelApiSchema } from './schemas/channel';

// Request schemas (no transform)
export {
    LoginResponseApiSchema,
    LoginRequestSchema,
    UpdateProfileRequestSchema,
    SignupRequestSchema,
    ForgotPasswordRequestSchema,
    ResetPasswordRequestSchema,
} from './schemas/requests/auth';
export {
    VideoUploadRequestSchema,
    VideoUpdateRequestSchema,
    VideoProgressRequestSchema,
} from './schemas/requests/video';
export {
    PlaylistCreateRequestSchema,
    PlaylistUpdateRequestSchema,
    PlaylistAddVideoRequestSchema,
    PlaylistReorderRequestSchema,
} from './schemas/requests/playlist';

// Types
export type { CommentApiInput, CommentApiOutput } from './schemas/comment';
export type { UserApiInput, UserApiOutput } from './schemas/user';
export type { VideoApiInput, VideoApiOutput } from './schemas/video';
export type { PlaylistApiInput, PlaylistApiOutput } from './schemas/playlist';
export type { VideoSummaryApiInput, VideoSummaryApiOutput } from './schemas/summary';
export type { VideoTranscriptionApiOutput } from './schemas/transcription';
export type { ChannelApiInput, ChannelApiOutput } from './schemas/channel';
export type {
    LoginResponseApiOutput,
    LoginRequest,
    UpdateProfileRequest,
    SignupRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
} from './schemas/requests/auth';
export type { VideoUploadRequest, VideoUpdateRequest, VideoProgressRequest } from './schemas/requests/video';
export type { PlaylistCreateRequest, PlaylistUpdateRequest } from './schemas/requests/playlist';
