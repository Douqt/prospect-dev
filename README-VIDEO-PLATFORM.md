# 🎥 Video Platform Setup Guide

## 🚀 Quick Start

### 1. Database Setup (CRITICAL)
Run the database migration to create video tables:

```bash
# If using Supabase CLI (recommended)
npx supabase migration up

# Or reset the entire database
npx supabase db reset

# If using direct PostgreSQL connection
psql -d your_database -f supabase/migrations/005_add_videos_tables.sql
```

**If you see "Database not initialized" error:**
1. Open terminal in the project directory
2. Run: `npx supabase migration up`
3. Refresh the videos page

### 2. Environment Variables
Ensure your `.env.local` has Mux credentials:

```env
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access Video Platform
Navigate to `http://localhost:3000/videos`

## 📋 Features Implemented

### ✅ Core Features
- [x] Video upload with Mux integration (all users)
- [x] Video browsing with search and filtering
- [x] Video playback with custom controls
- [x] Like and comment system
- [x] Universal upload permissions (any registered user)
- [x] Responsive grid layout
- [x] Infinite scroll pagination

### ✅ Advanced Features
- [x] Rate limiting and spam protection
- [x] Error boundaries and recovery
- [x] Mux webhook handling for video processing
- [x] View tracking and analytics
- [x] Comprehensive error handling
- [x] Loading states and progress indicators

## 🔧 API Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/videos` | GET | List and search videos | 1000/hour |
| `/api/videos/upload` | POST | Upload new video | 10/hour |
| `/api/videos/[id]/like` | POST | Like/unlike video | 100/minute |
| `/api/videos/[id]/comments` | GET/POST | Get/post comments | 100/minute |
| `/api/videos/[id]/view` | POST | Track video view | 10000/hour |
| `/api/webhooks/mux` | POST | Mux processing webhooks | N/A |

## 🎨 Components Architecture

```
src/components/videos/
├── VideosPage.tsx          # Main page container
├── VideoGrid.tsx           # Grid layout with infinite scroll
├── VideoCard.tsx           # Individual video card
├── VideoPlayer.tsx         # Full-screen player modal
└── VideoUploadModal.tsx    # Upload form modal

src/app/api/videos/
├── route.ts                # GET /api/videos
├── upload/route.ts         # POST /api/videos/upload
├── [id]/
│   ├── like/route.ts       # POST /api/videos/[id]/like
│   ├── comments/route.ts   # GET/POST /api/videos/[id]/comments
│   └── view/route.ts       # POST /api/videos/[id]/view
└── webhooks/
    └── mux/route.ts        # POST /api/webhooks/mux
```

## 🔒 Security Features

- **Rate Limiting**: Different limits for different endpoint types
- **Authentication**: JWT-based auth with role verification
- **Row Level Security**: Database-level access control
- **Input Validation**: File type, size, and content validation
- **Error Handling**: Comprehensive error boundaries and logging

## 📱 Responsive Design

The platform is fully responsive with:
- Mobile-first design approach
- Touch-friendly interactions
- Optimized video playback for mobile
- Adaptive grid layouts (1-4 columns based on screen size)

## 🚨 Error Handling

- **Network Errors**: Retry mechanisms and offline states
- **Upload Errors**: Detailed error messages and recovery options
- **Playback Errors**: Fallback states and error reporting
- **Rate Limiting**: User-friendly rate limit messages

## 🔄 Real-time Features

- **Live Like Counts**: Real-time like updates
- **Comment System**: Instant comment posting and display
- **View Tracking**: Real-time view count updates
- **Upload Progress**: Real-time upload progress tracking

## 📊 Analytics Ready

The platform includes comprehensive analytics hooks:
- Video view tracking
- Engagement metrics (likes, comments)
- Upload success rates
- User interaction patterns

## 🧪 Testing

Run the development server and test:

1. **Video Upload**: Try uploading a video as any registered user (no role restrictions)
2. **Video Browsing**: Search and filter videos
3. **Video Playback**: Click on videos to watch in full screen
4. **Interactions**: Like and comment on videos
5. **Mobile Testing**: Test on different screen sizes

**For Non-Authenticated Users:**
- Will see "Please login to upload videos" message
- Can browse and watch all videos
- Must login through the existing Prospect.money authentication system to upload
- No external login/signup buttons - uses the platform's native auth

## 🐛 Troubleshooting

### Common Issues

1. **Videos not loading**: Check database migration completed
2. **Upload failing**: Verify Mux credentials in environment
3. **Rate limiting**: Check if you're hitting API limits
4. **Playback issues**: Ensure Mux webhooks are configured

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=video-platform:*
```

## 🚀 Production Deployment

For production deployment:

1. **Environment Variables**: Set production Mux credentials
2. **Database**: Run migrations in production database
3. **Webhooks**: Configure Mux webhooks for your domain
4. **CDN**: Consider using a CDN for video thumbnails
5. **Monitoring**: Set up error tracking and analytics

## 📈 Performance Optimizations

- **Infinite Scroll**: Efficient pagination without full page reloads
- **Image Optimization**: Lazy loading and WebP format support
- **Caching**: Redis-ready architecture for scaling
- **Rate Limiting**: Prevents abuse and ensures fair usage

## 🔮 Future Enhancements

See the comprehensive roadmap in the main README for planned features including:
- Advanced analytics dashboard
- Live streaming capabilities
- Video recommendations
- Monetization features
- Enhanced moderation tools

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the error logs in the console
3. Test with different browsers and devices
4. Contact the development team with specific error details

---

**🎉 The video platform is ready to use! Start by uploading your first video and exploring the features.**
