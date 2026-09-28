"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { listShopReviews, type ShopReview } from "@/lib/customer/bookings";

export default function ReviewsTab({ shopId }: { shopId: string }) {
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const id = setTimeout(() => {
      listShopReviews(shopId)
        .then((rows) => {
          if (active) setReviews(rows);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [shopId]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  if (loading) {
    return <p className="text-sm text-slate-500">Loading reviews...</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white border border-slate-200/70 px-5 py-4 shadow-md shadow-slate-900/5">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                avgRating !== null && i < Math.round(avgRating)
                  ? "fill-amber-400 text-amber-600"
                  : "text-slate-600"
              }`}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-900">
          {avgRating !== null ? avgRating.toFixed(1) : "No rating yet"}
        </p>
        <p className="text-xs text-slate-500">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-white border border-slate-200/70 p-8 text-center shadow-md shadow-slate-900/5">
          <p className="text-sm text-slate-500">
            No reviews yet. They&apos;ll show up here once customers rate a
            completed job.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review, index) => (
            <div key={index} className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-md shadow-slate-900/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? "fill-amber-400 text-amber-600"
                          : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-900">
                {review.client_name}
              </p>
              {review.comment && (
                <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
              )}
              {review.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.photo_url}
                  alt="Review photo"
                  className="mt-2 h-24 w-24 rounded-lg object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
