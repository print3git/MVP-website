import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = window.SUPABASE_URL;
const supabaseKey = window.SUPABASE_ANON_KEY;
const ticker = document.getElementById("printing-ticker");
if (ticker && supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let queue = [];
  let idx = 0;

  async function loadInitial() {
    const { data } = await supabase
      .from("orders")
      .select("customer_name,country,model_name")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      queue = data.map(
        (o) =>
          `\uD83D\uDDA8\uFE0F ${o.customer_name} (${o.country}) just printed the ${o.model_name}!`,
      );
    }
  }

  function showNext() {
    if (!queue.length) return;
    ticker.classList.remove("ticker-fade");
    ticker.textContent = queue[idx];
    void ticker.offsetWidth;
    ticker.classList.add("ticker-fade");
    idx = (idx + 1) % queue.length;
  }

  supabase
    .channel("orders")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      (payload) => {
        const { customer_name, country, model_name } = payload.new;
        queue.unshift(
          `\uD83D\uDDA8\uFE0F ${customer_name} (${country}) just printed the ${model_name}!`,
        );
        queue = queue.slice(0, 20);
      },
    )
    .subscribe();

  loadInitial().then(() => {
    if (queue.length) showNext();
    setInterval(showNext, 8000);
  });
}
