import { connectDB } from "@/lib/db";
import GiveawayItem, { IGiveawayItem } from "@/models/GiveawayItem";
import { formatCurrency } from "@/lib/utils";
import mongoose from "mongoose";
import AddItemDialog from "./AddItemDialog";
import DeleteItemButton from "./DeleteItemButton";
import { Package, Tag } from "lucide-react";

async function getItems() {
  await connectDB();
  const docs = await GiveawayItem.find().sort({ createdAt: -1 }).lean<IGiveawayItem[]>();
  return docs.map((d) => ({
    _id: (d._id as mongoose.Types.ObjectId).toString(),
    name: d.name,
    description: d.description,
    estimatedValue: d.estimatedValue,
  }));
}

export default async function GiveawayItemsPage() {
  const items = await getItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Giveaway Items</h1>
          <p className="text-muted-foreground text-sm">
            Catalog of prizes available for giveaways
          </p>
        </div>
        <AddItemDialog />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No items yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add items to the catalog to use in giveaways</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item._id} className="rounded-xl border bg-card p-5 flex items-start gap-4 group">
              <div className="w-10 h-10 rounded-lg bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center flex-shrink-0">
                <Tag className="h-4.5 w-4.5 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                )}
                {item.estimatedValue > 0 && (
                  <p className="text-xs font-medium text-emerald-600 mt-1.5">
                    {formatCurrency(item.estimatedValue)}
                  </p>
                )}
              </div>
              <DeleteItemButton id={item._id} name={item.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
