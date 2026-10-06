<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Product media is stored in the private `product-images` bucket; only verified store administrators may upload or remove files, while a read-only catalog endpoint serves images to shoppers.
- Pix confirmation reads the owner's workspace Gmail only from authenticated server functions and consumes each verified Nubank receipt once to prevent duplicate deliveries.
- Admin Copilot conversations use route-scoped cloud threads; AI calls and privileged tools stay server-side and verify the sole admin before access.
